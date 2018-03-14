package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/ModuleAB/ModuleAB/agent/common"
	"github.com/ModuleAB/ModuleAB/agent/logger"
	"github.com/ModuleAB/ModuleAB/server/models"
)

func RegisterHost() (*models.Hosts, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}
	ip, err := getIP()
	logger.AppLog.Debug("Got IP:", ip)
	if err != nil {
		return nil, err
	}
	body, err := GetHost(hostname)
	if err != nil {
		return nil, err
	}
	if body != nil {
		return body, nil
	}
	body = &models.Hosts{
		Name:   hostname,
		IpAddr: ip,
	}
	err = AddHost(body)
	if err != nil {
		return nil, err
	}
	return nil, nil
}

func GetHost(hostname string) (*models.Hosts, error) {
	req, err := MakeRequest(
		"GET",
		fmt.Sprintf("/api/v1/hosts/%s", hostname),
		nil,
	)
	if err != nil {
		return nil, err
	}
	resp, err := StdHttp.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusNotFound:
		return nil, nil
	case http.StatusOK:
		h := make([]*models.Hosts, 0)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		logger.AppLog.Debug(string(b))
		err = json.Unmarshal(b, &h)
		if err != nil {
			return nil, err
		}
		if len(h) == 0 {
			return nil, fmt.Errorf("Failed to get hosts.")
		}
		return h[0], err
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
	case http.StatusInternalServerError:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("%s %s", e["message"], e["error"])
	default:
		return nil, fmt.Errorf("Unknown error: %d", resp.StatusCode)
	}
	return nil, fmt.Errorf("Unknown error.")
}

func AddHost(h *models.Hosts) error {
	b, err := json.Marshal(h)
	if err != nil {
		return err
	}
	buf := bytes.NewReader(b)
	req, err := MakeRequest("POST", "/api/v1/hosts", buf)
	if err != nil {
		return err
	}
	resp, err := StdHttp.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusForbidden:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return err
		}
		return fmt.Errorf(e["error"])
	case http.StatusBadRequest:
		fallthrough
	case http.StatusInternalServerError:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return err
		}
		return fmt.Errorf("%s %s", e["message"], e["error"])
	case http.StatusCreated:
		return nil
	default:
		return fmt.Errorf("Unknown error: %d", resp.StatusCode)
	}
	return fmt.Errorf("Unknown error.")
}

func getIP() (string, error) {
	target := regexp.MustCompile("^(http://|https://)?(.*)/*").
		ReplaceAllString(common.Server, "$2")
	conn, err := net.Dial("tcp4", target)
	if err != nil {
		return "", err
	}
	defer conn.Close()
	return strings.Split(conn.LocalAddr().String(), ":")[0], nil
}
