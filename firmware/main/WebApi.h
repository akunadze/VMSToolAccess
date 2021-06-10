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

class LogEntry {
public:
    enum OpType {
        LogIn,
        LogOut,
        Error
    };

    LogEntry(const char *card, OpType op, time_t time);

    cJSON *getJson();

private:
    std::string m_card;
    OpType m_op;
    time_t m_time;
};

class WebApi {
public:
    WebApi(Config &config, WiFi &wifi);
    ~WebApi();

    void startHelloTask();
    void addLog(const char *card, LogEntry::OpType op);
private:
    Config &m_config;
    WiFi &m_wifi;
    std::vector<LogEntry> m_log;
    SemaphoreHandle_t m_semLog;
    EventGroupHandle_t m_eventLogAvailable;

    void sendHello();
    static void helloTask(void *pvParam);
};