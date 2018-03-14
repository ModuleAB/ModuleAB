package client

import (
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ModuleAB/ModuleAB/agent/auth"
	"github.com/ModuleAB/ModuleAB/agent/common"
)

var StdHttp *http.Client

func init() {
	StdHttp = new(http.Client)
}

func MakeRequest(method, url string, body io.Reader) (*http.Request, error) {
	url = fmt.Sprintf("%s%s", common.Server, url)
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	timeNow := time.Now().UTC().Format(time.RFC1123)
	req.Header.Set("Date", timeNow)
	req.Header.Set("Signature", auth.GetSignature(timeNow, req.URL.Path))
	return req, nil
}
