package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/ModuleAB/ModuleAB/server/models"
)

func UploadRecord(r *models.Records) error {
	b, err := json.Marshal(r)
	if err != nil {
		return err
	}
	buf := bytes.NewReader(b)
	req, err := MakeRequest("POST", "/api/v1/records", buf)
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

func CheckRecords(record *models.Records) (bool, error) {
	req, err := MakeRequest(
		"GET",
		fmt.Sprintf(
			"/api/v1/records?path=%s&filename=%s&host=%s&appSet=%s&backupSet=%s",
			record.Path.Path,
			record.Filename,
			record.Host.Name,
			record.AppSet.Name,
			record.BackupSet.Name,
		),
		nil,
	)
	if err != nil {
		return false, err
	}
	resp, err := StdHttp.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusForbidden:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return false, err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return false, err
		}
		return false, fmt.Errorf(e["error"])
	case http.StatusBadRequest:
		fallthrough
	case http.StatusInternalServerError:
		e := make(map[string]string)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return false, err
		}
		err = json.Unmarshal(b, &e)
		if err != nil {
			return false, err
		}
		return false, fmt.Errorf("%s %s", e["message"], e["error"])
	case http.StatusOK:
		records := make([]*models.Records, 0)
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return false, err
		}
		err = json.Unmarshal(b, &records)
		if err != nil {
			return false, err
		}
		for _, v := range records {
			if v.GetFullPath() == record.GetFullPath() {
				return true, nil
			}
		}
	default:
		return false, fmt.Errorf("Unknown error: %d", resp.StatusCode)
	}
	return false, nil
}

func FailLog(host *models.Hosts, filename string) error {
	failLog := &models.FailLog{
		Log:  fmt.Sprint("Backup file filed:", filename),
		Host: host,
	}
	b, err := json.Marshal(failLog)
	if err != nil {
		return err
	}
	buf := bytes.NewReader(b)
	req, err := MakeRequest("POST", "/api/v1/faillogs", buf)
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
