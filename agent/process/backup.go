package process

import (
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/ModuleAB/ModuleAB/agent/client"
	"github.com/ModuleAB/ModuleAB/agent/logger"
	"github.com/ModuleAB/ModuleAB/server/models"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"golang.org/x/exp/inotify"
)

const (
	// UseLowMemoryMode should open running with memory < 1G
	UseLowMemoryMode = true
	// Will use gzip
	UseCompress = true
)

// BackupManager module
type BackupManager struct {
	JobList []string
	client.AliConfig
	Watcher       *inotify.Watcher
	host          *models.Hosts
	LowMemoryMode bool
	Compress      bool
	PreserveFile  bool
}

// NewBackupManager is to create a new `BackupManager` instance
func NewBackupManager(config client.AliConfig, lowmemory bool, compress bool, preservefile bool) (*BackupManager, error) {
	var err error
	b := new(BackupManager)
	b.JobList = make([]string, 0)
	b.AliConfig = config
	b.Watcher, err = inotify.NewWatcher()
	b.LowMemoryMode = lowmemory
	b.Compress = compress
	b.PreserveFile = preservefile
	if err != nil {
		return nil, err
	}
	return b, nil
}

// Update is to configure `BackupManager` instance with path to be monitored.
func (b *BackupManager) Update(ps []*models.Paths) error {
	for _, v := range ps {
		found := false
		for _, v0 := range b.JobList {
			if v.Path == v0 {
				found = true
				break
			}
		}
		if found {
			continue
		}
		err := b.Watcher.AddWatch(
			v.Path, inotify.IN_CLOSE_WRITE|inotify.IN_MOVED_TO)
		if err != nil {
			logger.AppLog.Warning("Monitor start failed:", err)
			continue
		}
		logger.AppLog.Info("Monitor for", v.Path, "started.")
		b.JobList = append(b.JobList, v.Path)
	}
	for k, v := range b.JobList {
		found := false
		for _, v0 := range ps {
			if v0.Path == v {
				found = true
				break
			}
		}
		if !found {
			err := b.Watcher.RemoveWatch(v)
			if err != nil {
				logger.AppLog.Warning("Monitor stop failed:", err)
				continue
			}
			logger.AppLog.Info("Monitor for", k, "stopped.")
			b.JobList = append(b.JobList[:k], b.JobList[k+1:]...)
		}
	}
	return nil
}

// Run is to start `BackupManager` instance.
func (b *BackupManager) Run(h *models.Hosts) {
	logger.AppLog.Info("Backup process started.")
	for {
		select {
		case event := <-b.Watcher.Event:
			logger.AppLog.Debug("Get event:", event)
			for _, v := range h.Paths {
				filename, err := filepath.Abs(event.Name)
				if err != nil {
					logger.AppLog.Warn("Failed to fetch path:", err)
					continue
				}
				if strings.HasPrefix(filename, v.Path) {
					if b.LowMemoryMode {
						b.doBackup(v, filename, h, event.Name)
					} else {
						go b.doBackup(v, filename, h, event.Name)
					}
				}
			}
		}
	}
}

/* Params:
 * 	v *models.Paths
 *  filename string -- file full path
 *	h *models.Hosts
 *	eName string -- file path from inotify
 */
func (b *BackupManager) doBackup(v *models.Paths, filename string, h *models.Hosts, eName string) {
	defer func() {
		x := recover()
		if x != nil {
			logger.AppLog.Warn(
				fmt.Sprintf("Error While Uploading \"%s\", for reason %v", filename, x),
			)
		}
	}()

	if v.BackupSet == nil {
		logger.AppLog.Warn("No BackupSet or AppSet got, skip")
		return
	}
	_, file := path.Split(strings.TrimSpace(filename))
	file = time.Now().Format("2006/01/02") + "/" + file

	if b.Compress {
		if !regexp.MustCompile("\\.gz$|\\.zip$|\\.tgz$|\\.bz2").MatchString(eName) {
			gz := exec.Command("gzip", eName)
			err := gz.Run()
			if err != nil {
				logger.AppLog.Warn(eName, "Compress Failed.")
			} else {
				logger.AppLog.Debug(eName, " Will upload compressed file.")
				return
			}
		}
	}

	record := &models.Records{
		Filename:   file,
		Host:       h,
		BackupSet:  v.BackupSet,
		AppSet:     h.AppSet,
		Path:       v,
		Type:       models.RecordTypeBackup,
		BackupTime: time.Now(),
	}
	logger.AppLog.Debug("Now is:", time.Now().Format(time.RFC3339))
	logger.AppLog.Debug("Record:", record)
	ossclient, err := oss.New(
		v.BackupSet.Oss.Endpoint, b.ApiKey, b.ApiSecret)
	if err != nil {
		logger.AppLog.Warn("Error while connect to oss:", err)
		fmt.Println("Error while connect to oss:", err)
		return
	}
	bucket, err := ossclient.Bucket(v.BackupSet.Oss.BucketName)
	if err != nil {
		logger.AppLog.Warn(
			"Error while retrievaling bucket:", err)
		fmt.Println(
			"Error while retrievaling bucket:", err)
		return
	}

	ps := strings.Split(path.Dir(record.GetFullPath()), "/")
	var (
		dir           string
		lock          sync.Mutex
		dirCreated    = true
		isRecoverFile = false
	)
	lock.Lock()
	logger.AppLog.Debug("recoverdFiles is:", recoverdFiles)
	for k, v := range recoverdFiles {
		if eName == v {
			recoverdFiles = append(recoverdFiles[:k], recoverdFiles[k+1:]...)
			isRecoverFile = true
		}
	}
	lock.Unlock()
	if isRecoverFile {
		logger.AppLog.Info("File", eName, "is recover file.")
		return
	}
	for delay := 0; delay <= 50; delay += 10 {
		if delay > 0 {
			logger.AppLog.Info("Retry in", delay, "Minutes")
			time.Sleep(time.Duration(delay) * time.Minute)
		}
		for _, p := range ps {
			dir = fmt.Sprintf("%s%s/", dir, p)
			err = bucket.PutObject(dir, strings.NewReader(""))
			if err != nil {
				logger.AppLog.Warn(
					"Error while making dir on bucket:", err)
				fmt.Println(
					"Error while making dir on bucket:", err)
				dirCreated = false
				break
			}
		}
		if !dirCreated {
			continue
		}

		err = bucket.UploadFile(
			record.GetFullPath(),
			eName,
			100*1024*1024,
		)
		if err != nil {
			logger.AppLog.Warn(
				"Error while uploading:", err)
			fmt.Println(
				"Error while uploading:", err)
			continue
		}
		if strings.HasSuffix(eName, ".gz") && !b.PreserveFile {
			err := os.Remove(eName)
			logger.AppLog.Warn(
				"Error while removing:", err)
			fmt.Println(
				"Error while removing:", err)
		}
		err = client.UploadRecord(record)
		if err != nil {
			logger.AppLog.Warn(
				"Error while recording:", err)
			fmt.Println(
				"Error while recording:", err)
			continue
		}
		return
	}
	logger.AppLog.Warn("Backup file:", eName, "Failed.")
	err = client.FailLog(h, eName)
	if err != nil {
		logger.AppLog.Warn("Upload FailLog failed:", err)
	}
}
