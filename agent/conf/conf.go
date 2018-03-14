package conf

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/ModuleAB/ModuleAB/agent/consts"
)

type Config map[string]interface{}

func ReadConfig(filename string) (Config, error) {
	b, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	c := make(Config)
	c.parse(b)
	return c, nil
}

func (c Config) parse(b []byte) {
	lines := strings.Split(
		strings.Replace(string(b), "\r", "", -1),
		"\n",
	)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		cfgs := strings.SplitN(line, "=", 2)
		c[cfgs[0]] = cfgs[1]
	}
}

func (c Config) Get(key string) (interface{}, error) {
	v, ok := c[key]
	if !ok {
		return nil, fmt.Errorf("Key '%s' not found.", key)
	}
	return v, nil
}

func (c Config) GetInt(key string) (int, error) {
	v, err := c.Get(key)
	if err != nil {
		return -1, err
	}
	i, ok := v.(int)
	if !ok {
		return -1, fmt.Errorf("Cannot convert to int.")
	}
	return i, nil
}

func (c Config) GetString(key string) string {
	v, _ := c.Get(key)
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}

func (c Config) GetBool(key string) bool {
	v, _ := c.Get(key)
	s, ok := v.(string)
	if !ok {
		return false
	}
	if strings.ToLower(s) == "true" {
		return true
	}
	return false
}

var AppConfig Config

func init() {
	var err error
	AppConfig, err = ReadConfig(consts.DefaultConfigFile)
	if err != nil {
		fmt.Fprintln(
			os.Stderr, consts.ErrorFormat,
			"Cannot read config file.", err,
		)
		os.Exit(1)
	}
}
