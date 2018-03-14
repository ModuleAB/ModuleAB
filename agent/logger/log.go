package logger

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/ModuleAB/ModuleAB/agent/consts"
)

const (
	LogLevelDebug = iota
	LogLevelInformation
	LogLevelWarning
	LogLevelError
	LogLevelFatal
)

// Logger module
type Logger struct {
	log.Logger
	Level int
}

func (l *Logger) out(level string, v interface{}) {
	l.SetPrefix(level)
	l.Println(interfaceToLog(v))
}

// Debug is loglevel Debug
func (l *Logger) Debug(v ...interface{}) {
	if l.Level <= LogLevelDebug {
		l.out("Debug\t", v)
	}
}

func (l *Logger) Information(v ...interface{}) {
	if l.Level <= LogLevelInformation {
		l.out("Info\t", v)
	}
}

func (l *Logger) Info(v ...interface{}) {
	l.Information(v)
}

func (l *Logger) Warning(v ...interface{}) {
	if l.Level <= LogLevelWarning {
		l.out("Warn\t", v)
	}
}

func (l *Logger) Warn(v ...interface{}) {
	l.Warning(v)
}

func (l *Logger) Error(v ...interface{}) {
	if l.Level <= LogLevelError {
		l.out("Error\t", v)
	}
}

func (l *Logger) Fatal(v ...interface{}) {
	if l.Level <= LogLevelFatal {
		l.out("Fatal\t", v)
	}
}

// AppLog is default log instance
var AppLog Logger

// Init is to configure log module
func Init() {
	w, err := os.OpenFile(
		consts.DefaultLogFile,
		os.O_APPEND|os.O_CREATE|os.O_RDWR,
		0666,
	)
	if err != nil {
		fmt.Fprintln(
			os.Stderr, consts.ErrorFormat,
			"Cannot write log file.", err,
		)
		os.Exit(1)
	}
	AppLog.SetFlags(log.LstdFlags)
	AppLog.SetOutput(w)
	AppLog.Level = LogLevelInformation
}

// StringLevelToInt is to convert string log level to internal code.
func StringLevelToInt(l string) int {
	switch l {
	case "deb":
		fallthrough
	case "debug":
		return LogLevelDebug
	case "warn":
		fallthrough
	case "warning":
		return LogLevelWarning
	case "error":
		fallthrough
	case "err":
		return LogLevelError
	case "fatal":
		return LogLevelFatal
	case "info":
		fallthrough
	case "information":
		fallthrough
	default:
		return LogLevelInformation
	}
}

func interfaceToLog(v ...interface{}) string {
	var s string
	for _, n := range v {
		s = fmt.Sprintf("%s%v ", s, n)
	}
	return strings.Trim(s, "[] ")
}
