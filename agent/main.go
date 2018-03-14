/* ModuleAB Agent*/
package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/ModuleAB/ModuleAB/agent/client"
	"github.com/ModuleAB/ModuleAB/agent/common"
	"github.com/ModuleAB/ModuleAB/agent/conf"
	"github.com/ModuleAB/ModuleAB/agent/logger"
	"github.com/ModuleAB/ModuleAB/agent/process"
	"github.com/ModuleAB/ModuleAB/server/models"
	"github.com/ModuleAB/ModuleAB/server/version"
	"github.com/erikdubbelboer/gspt"
)

const (
	daemonStop = iota
	daemonReload
)

func daemonCtl(s int) {
	bpid, err := ioutil.ReadFile(
		conf.AppConfig.GetString("pidfile"),
	)
	if err != nil {
		fmt.Println("Cannot find pid file, will not run.")
		os.Exit(1)
	}
	pid, err := strconv.Atoi(string(bpid))
	if err != nil {
		fmt.Println("Invalid pid, will not run.")
		os.Exit(1)
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		fmt.Println("Cannot fild proc=", pid)
		os.Exit(1)
	}
	if s == daemonStop {
		err = proc.Signal(os.Interrupt)
	} else {
		err = proc.Kill()
	}
	if err != nil {
		fmt.Println("Cannot stop daemon.")
		os.Exit(1)
	}
	os.Exit(0)
}

func showHelp() {
	fmt.Println("ModuleAB agent help")
	fmt.Println("\tUsage:", os.Args[0], "[stop|restart|help]")
	fmt.Println("\tDefault will start ModuleAB agent as daemon.")
	fmt.Println("\t\tstop: Stop the daemon.")
	fmt.Println("\t\trestart: Restart the daemon.")
	fmt.Println("\t\thelp: Show this help.")
}

func lockFile() error {
	fd, err := os.OpenFile(
		conf.AppConfig.GetString("lockfile"),
		os.O_RDWR|os.O_CREATE,
		0600,
	)
	if err != nil {
		return err
	}
	err = syscall.Flock(int(fd.Fd()), syscall.LOCK_EX)
	if err != nil {
		return err
	}
	return nil
}

func main() {
	timeout, err := conf.AppConfig.GetInt("timeout")
	if err == nil {
		client.StdHttp.Timeout = time.Duration(timeout) * time.Second
	}
	var isWorker = false

	if len(os.Args[1:]) != 0 {
		switch os.Args[1] {
		case "stop":
			daemonCtl(daemonStop)
		case "restart":
			fallthrough
		case "reload":
			daemonCtl(daemonReload)
		case "worker":
			isWorker = true
		default:
			showHelp()
			os.Exit(1)
		}
	}
	if !isWorker {
		if os.Getppid() != 1 {
			exePath, _ := filepath.Abs(os.Args[0])
			cmd := exec.Command(exePath, os.Args[1:]...)
			cmd.Stdin = os.Stdin
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Start()
			fmt.Println("ModuleAB agent will run as daemon.")
			os.Exit(0)
		} else {
			gspt.SetProcTitle(fmt.Sprintf("%s: ModuleAB Agent Master Process", os.Args[0]))
			for {
				exePath, _ := filepath.Abs(os.Args[0])
				cmd := exec.Command(exePath, "worker")
				cmd.Stdin = os.Stdin
				cmd.Stdout = os.Stdout
				cmd.Stderr = os.Stderr
				err := cmd.Run()
				if err == nil {
					os.Exit(0)
				}
			}
		}
	}

	gspt.SetProcTitle(fmt.Sprintf("%s ModuleAB Agent Worker Process", os.Args[0]))

	err = lockFile()
	if err != nil {
		fmt.Println("Lock Existed, exit.")
		os.Exit(1)
	}

	ioutil.WriteFile(
		conf.AppConfig.GetString("pidfile"),
		[]byte(fmt.Sprint(os.Getpid())),
		0600,
	)

	logger.Init()

	logger.AppLog.Info("ModuleAB agent", version.Version, "starting...")
	logger.AppLog.Level = logger.StringLevelToInt(
		conf.AppConfig.GetString("loglevel"),
	)
	logger.AppLog.Debug("Got server:", common.Server)
	logger.AppLog.Debug("Got login key:", common.LoginKey)
	c, err := client.GetAliConfig()
	if err != nil {
		logger.AppLog.Fatal("Got Error:", err)
		os.Exit(1)
	}
	logger.AppLog.Debug("Got config", c.ApiKey, c.ApiSecret)

	go func() {
		var c = make(chan os.Signal, 1)
		signal.Notify(c, os.Interrupt)
		<-c
		logger.AppLog.Info("Agent worker is shutting down.")
		os.Exit(0)
	}()

	for {
		run(c)
		logger.AppLog.Error("Main thread crashed, restarting...")
	}
}

func run(c *client.AliConfig) {
	defer func() {
		x := recover()
		if x != nil {
			logger.AppLog.Error("Got fatal error:", x)
			var stack = make([]byte, 2<<10)
			runtime.Stack(stack, true)
			logger.AppLog.Error("Stack trace:\n", string(stack))
		}
	}()

	var (
		d   *models.Hosts
		err error
	)
	for {
		d, err = client.RegisterHost()
		if err != nil {
			logger.AppLog.Debug("Got Error:", err)
			os.Exit(1)
		}
		if d == nil {
			logger.AppLog.Info("Register host succeed. waiting complete info.")
			fmt.Println("Register host succeed. waiting complete info.")
			time.Sleep(5 * time.Second)
			continue
		}
		if d.AppSet == nil {
			logger.AppLog.Info("App set not found. wait until ok.")
			fmt.Println("App set not found. wait until ok.")
			time.Sleep(5 * time.Second)
			continue
		}
		if len(d.Paths) == 0 {
			logger.AppLog.Info("No valid Path found. wait until ok.")
			fmt.Println("No valid Path found. wait until ok.")
			time.Sleep(5 * time.Second)
			continue
		}
		break
	}
	logger.AppLog.Info("Starting remove manager...")
	if len(d.ClientJobs) != 0 {
		r := process.NewRemoveManager()
		r.Update(d)
	}
	logger.AppLog.Info("Starting recover manager...")
	go func() {
		for {
			process.RunWebsocket(d, c.ApiKey, c.ApiSecret)
			logger.AppLog.Error("Connection to server is closed, reconnect.")
			time.Sleep(5 * time.Second)
		}
	}()
	b, err := process.NewBackupManager(*c, conf.AppConfig.GetBool("lowmemorymode"), conf.AppConfig.GetBool("compress"), conf.AppConfig.GetBool("preservefile"))
	if err != nil {
		logger.AppLog.Warn("Got error while making backup manager:", err)
		fmt.Println("Got error while making backup manager:", err)
		os.Exit(1)
	}
	logger.AppLog.Info("Starting backup manager...")
	b.Update(d.Paths)
	b.Run(d)
}
