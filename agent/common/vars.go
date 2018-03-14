package common

import (
	"flag"

	"github.com/ModuleAB/ModuleAB/agent/conf"
)

var (
	Server        string
	LoginKey      string
	UploadThreads int
)

func init() {
	flag.StringVar(
		&Server, "server", "",
		"Specify ModuleAB server",
	)
	flag.StringVar(
		&LoginKey, "key", "",
		"Specify ModuleAB login key",
	)
	flag.IntVar(
		&UploadThreads, "threads", 3,
		"Specify ModuleAB upload threads.",
	)
	flag.Parse()
	if Server == "" {
		Server = conf.AppConfig.GetString("server")
	}
	if LoginKey == "" {
		LoginKey = conf.AppConfig.GetString("loginkey")
	}
	thereads, err := conf.AppConfig.GetInt("uploadthreads")
	if err == nil && thereads > 0 && UploadThreads == 3 {
		UploadThreads = thereads
	}
}
