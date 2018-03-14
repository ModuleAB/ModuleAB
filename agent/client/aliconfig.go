package client

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

type AliConfig struct {
	ApiKey    string `json:"ali_key"`
	ApiSecret string `json:"ali_secret"`
}

func GetAliConfig() (*AliConfig, error) {
	req, err := MakeRequest("GET", "/api/v1/client/config", nil)
	if err != nil {
		return nil, err
	}
	resp, err := StdHttp.Do(req)
	if err != nil {
		return nil, err
	}
	switch resp.StatusCode {
	case http.StatusOK:
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		c := new(AliConfig)
		err = json.Unmarshal(b, c)
		if err != nil {
			return nil, err
		}
		return c, nil
	case http.StatusForbidden:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf(e["error"])
	default:
		return nil, fmt.Errorf("Unkown error:%d", resp.StatusCode)
	}
	return nil, nil
}
