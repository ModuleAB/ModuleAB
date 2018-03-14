package process

import (
	"io/ioutil"
	"os"
	"path"
	"time"

	"github.com/ModuleAB/ModuleAB/agent/client"
	"github.com/ModuleAB/ModuleAB/agent/logger"
	"github.com/ModuleAB/ModuleAB/server/models"
)

// RemoveManager module
type RemoveManager struct {
	JobList    []string
	JobChannel map[string]chan int
}

// NewRemoveManager is to create new `RemoveManager` instance
func NewRemoveManager() *RemoveManager {
	r := new(RemoveManager)
	r.JobList = make([]string, 0)
	return r
}

// Update is to configure `RemoveManager` settings.
func (r *RemoveManager) Update(h *models.Hosts) error {
	ps := h.Paths
	for _, v := range ps {
		found := false
		for _, v0 := range r.JobList {
			if v.Path == v0 {
				found = true
				break
			}
		}
		if found {
			continue
		}
		for _, v0 := range h.ClientJobs {
			for _, v1 := range v0.Paths {
				if v1.Path == v.Path && v0.Type == models.ClientJobsTypeDelete {
					r.JobList = append(r.JobList, v.Path)
					r.JobChannel[v.Path] = make(chan int)
					go r.Run(v0.Period, v0.ReservedTime, v, h)
				}
			}
		}
	}
	for k, v := range r.JobList {
		found := false
		for _, v0 := range ps {
			if v0.Path == v {
				found = true
				break
			}
		}
		if !found {
			r.JobList = append(r.JobList[:k], r.JobList[k+1:]...)
			r.JobChannel[v] <- 1 //Go exit
		}
	}
	return nil
}

// Run is to start `RemoveManager`
func (r *RemoveManager) Run(
	period, reserve int,
	mpath *models.Paths,
	host *models.Hosts,
) {
	logger.AppLog.Info("Remove monitor of", mpath.Path, "started.")
	defer logger.AppLog.Info("Remove monitor of", mpath.Path, "stopped.")
	for {
		select {
		case <-time.Tick(time.Duration(period) * time.Second):

			files, err := ioutil.ReadDir(mpath.Path)
			if err != nil {
				logger.AppLog.Warn("Got error:", err)
				continue
			}
			for _, file := range files {
				if time.Now().Sub(file.ModTime()) >
					time.Duration(reserve)*time.Second &&
					!file.IsDir() {
					record := &models.Records{
						Path:      mpath,
						AppSet:    host.AppSet,
						Host:      host,
						Filename:  file.Name(),
						BackupSet: mpath.BackupSet,
					}
					found, err := client.CheckRecords(record)
					if err != nil {
						logger.AppLog.Warn("Got error:", err)
						continue
					}
					if found {
						err = os.Remove(path.Join(mpath.Path, file.Name()))
						if err != nil {
							logger.AppLog.Warn("Got error:", err)
							continue
						}
						logger.AppLog.Info(
							"File:",
							path.Join(mpath.Path, file.Name()),
							"removed.",
						)
					}
				}
			}
		case <-r.JobChannel[mpath.Path]:
			return
		}
	}
}
