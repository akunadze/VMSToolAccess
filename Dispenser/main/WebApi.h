#pragma once

#include "esp_http_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/semphr.h"
#include "cjson.h"
#include <string>
#include <vector>

class Config;
class WiFi;

class WebClient {
public:
    WebClient(Config &conf, const char *path, const char *postData = NULL);
    ~WebClient();

    int getStatus() { return m_status; }
    const char *getResponse() { return m_response; }
    void waitForResponse();

private:
    static esp_err_t eventHandler(esp_http_client_event_t *evt);
    void receiveData(void *data, int cbData);
    void signalEnd();

    Config &m_config;
    esp_http_client_handle_t m_hClient;
    EventGroupHandle_t m_eventDone;
    int m_status;
    char *m_response;
};

class WebApi {
public:
    WebApi(Config &config, WiFi &wifi);
    ~WebApi();

    enum RESULT {
        SUCCESS,
        COMM_ERROR,
        INTERNAL_ERROR,
        ERROR_MSG
    };

    RESULT queryCard(const char *doorCard, char *name);
    RESULT registerCard(const char *doorCard, const char *toolCard, char *errorMsg);

private:
    Config &m_config;
    WiFi &m_wifi;

};