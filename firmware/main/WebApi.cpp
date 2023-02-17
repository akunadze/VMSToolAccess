#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_tls.h"
#include "esp_http_client.h"
#include "WebApi.h"
#include "Config.h"
#include "WiFi.h"
#include "SemaphoreLock.h"
#include "time.h"
#include "esp_heap_trace.h"
#include "ca_pem.h"


static const char *TAG = "web api";

WebClient::WebClient(Config &conf, const char *path, const char *postData) : m_config(conf), m_status(0), m_response(NULL) {
    char url[256];

    strcpy(url, m_config.getMasterUrl());
    if (url[strlen(url) - 1] == '/') {
        url[strlen(url) - 1] = '\0';
    }

    strcat(url, path);

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
    esp_http_client_config_t config = {
        .url = url,
        .cert_pem = serverCert,
        .timeout_ms = 20000,
        .event_handler = WebClient::eventHandler,
        .user_data = this
    };
#pragma GCC diagnostic pop


    m_hClient = esp_http_client_init(&config);

    if (postData) {
        esp_http_client_set_method(m_hClient, HTTP_METHOD_POST);
        esp_http_client_set_header(m_hClient, "Content-Type", "application/json");
        esp_http_client_set_post_field(m_hClient, postData, strlen(postData));
    }

    m_eventDone = xEventGroupCreate();

    esp_err_t err = esp_http_client_perform(m_hClient);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "esp_http_client_perform returned %s\n", esp_err_to_name(err));
        m_status = -1;
        signalEnd();
    }
}

WebClient::~WebClient() {
    esp_http_client_cleanup(m_hClient);
    vEventGroupDelete(m_eventDone);
    if (m_response) {
        delete m_response;
    }
}


void WebClient::receiveData(void *data, int cbData) {
    if (m_response) {
        size_t oldDataLen = strlen(m_response);
        
        char *newResponse = new char[oldDataLen + cbData + 1];
        strcpy(newResponse, m_response);
        delete m_response;
        m_response = newResponse;
        memcpy(m_response + oldDataLen, data, cbData);
        m_response[oldDataLen + cbData] = 0;
    } else {
        m_response = new char[cbData + 1];
        memcpy(m_response, data, cbData);
        m_response[cbData] = 0;
    }
}

void WebClient::signalEnd() {
    xEventGroupSetBits(m_eventDone, 1);
}

void WebClient::waitForResponse() {
    xEventGroupWaitBits(m_eventDone, 1, false, false, portMAX_DELAY);
}

esp_err_t WebClient::eventHandler(esp_http_client_event_t *evt) {
    WebClient *pThis = (WebClient *)evt->user_data;

    switch(evt->event_id) {
        case HTTP_EVENT_ERROR:
            ESP_LOGD(TAG, "HTTP_EVENT_ERROR\n");
            pThis->m_status = esp_http_client_get_status_code(pThis->m_hClient);;
            pThis->signalEnd();
            break;
        case HTTP_EVENT_ON_CONNECTED:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_CONNECTED\n");
            break;
        case HTTP_EVENT_HEADER_SENT:
            ESP_LOGD(TAG, "HTTP_EVENT_HEADER_SENT\n");
            break;
        case HTTP_EVENT_ON_HEADER:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_HEADER, key=%s, value=%s\n", evt->header_key, evt->header_value);
            break;
        case HTTP_EVENT_ON_DATA:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_DATA, len=%d\n", evt->data_len);
            /*
             *  Check for chunked encoding is added as the URL for chunked encoding used in this example returns binary data.
             *  However, event handler can also be used in case chunked encoding is used.
             */
            if (!esp_http_client_is_chunked_response(evt->client)) {
                pThis->receiveData(evt->data, evt->data_len);
            }

            break;
        case HTTP_EVENT_ON_FINISH:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_FINISH\n");
            pThis->m_status = esp_http_client_get_status_code(pThis->m_hClient);
            pThis->signalEnd();
            break;
        case HTTP_EVENT_DISCONNECTED:
            ESP_LOGD(TAG, "HTTP_EVENT_DISCONNECTED\n");
            pThis->m_status = -1;
            pThis->signalEnd();
            break;
    }
    return ESP_OK;
}

WebApi::WebApi(Config &config, WiFi &wifi) : 
    m_config(config), m_wifi(wifi)
{
    m_semLog = xSemaphoreCreateBinary();
    xSemaphoreGive(m_semLog);

    m_eventLogAvailable = xEventGroupCreate();
}

WebApi::~WebApi() {
    vEventGroupDelete(m_eventLogAvailable);
}

void WebApi::sendHello() {
    auto obj = cJSON_CreateObject();
    cJSON_AddItemToObject(obj, "mac", cJSON_CreateString(m_config.getMac()));

    std::vector<LogEntry> logsToSend;
    {
        SemaphoreLock lock(m_semLog);
        std::move(m_log.begin(), m_log.end(), std::back_inserter(logsToSend));
        m_log.clear();
    }

    auto logsArray = cJSON_CreateArray();
    for (auto it = logsToSend.begin(); it != logsToSend.end(); it++) {
        auto json = it->getJson();
        cJSON_AddItemToArray(logsArray, json);
    }

    cJSON_AddItemToObject(obj, "logs", logsArray);

    char *printed = cJSON_PrintUnformatted(obj);
    WebClient client(m_config, "/api/hello", printed);
    
    // char data[64];

    // sprintf(data, "{\"mac\":\"%s\"}", m_config.getMac());

    // WebClient client(m_config, "/api/hello", data);


    client.waitForResponse();

    free(printed);
    cJSON_Delete(obj);

    if (client.getStatus() == 200) {
        std::vector<std::string> newUsers;

        ESP_LOGI(TAG, "%s", client.getResponse());

        auto json = cJSON_Parse(client.getResponse());
        if (json) {
            auto timeField = cJSON_GetObjectItem(json, "time");
            if (timeField && cJSON_IsNumber(timeField)) {
                timeval tv;
                tv.tv_usec = 0;
                tv.tv_sec = timeField->valuedouble;
                settimeofday(&tv, NULL);
            }
            
            auto usersArray = cJSON_GetObjectItem(json, "userCards");
            if (usersArray && cJSON_IsArray(usersArray)) {
                cJSON *user = NULL;
                cJSON_ArrayForEach(user, usersArray) {
                    if (user && cJSON_IsString(user)) {
                        newUsers.push_back(std::string(user->valuestring));
                        ESP_LOGI(TAG, "New user %s", user->valuestring);
                    }
                }
            }
            cJSON_Delete(json);
        }

        m_config.setUsers(newUsers);
    } else {
        ESP_LOGE(TAG, "WebClient returned status %d", client.getStatus());

        {
            SemaphoreLock lock(m_semLog);
            m_log.insert(m_log.begin(), logsToSend.begin(), logsToSend.end());
        }
    }
}

void WebApi::startHelloTask() {
    xTaskCreate(&WebApi::helloTask, "HelloTask", 8192, this, 5, NULL);
}

void WebApi::helloTask(void *pvParam) {
    WebApi *pThis = (WebApi *)pvParam;

    while (true) {
        if (pThis->m_wifi.isConnected()) {
            ESP_LOGI(TAG, "Sending hello. Heap %d", esp_get_free_heap_size());
            pThis->sendHello();
        }

        xEventGroupWaitBits(pThis->m_eventLogAvailable, 1, false, false, pdMS_TO_TICKS(5000));
        xEventGroupClearBits(pThis->m_eventLogAvailable, 1);
    }
}

void WebApi::addLog(const char *card, LogEntry::OpType op) {
    SemaphoreLock lock(m_semLog);

    m_log.push_back(LogEntry(card, op, time(NULL)));
    xEventGroupSetBits(m_eventLogAvailable, 1);
}

LogEntry::LogEntry(const char *card, OpType op, time_t time) :
    m_card(card), m_op(op), m_time(time)
{
}

cJSON *LogEntry::getJson() {
    auto obj = cJSON_CreateObject();
    cJSON_AddItemToObject(obj, "card", cJSON_CreateString(m_card.c_str()));
    switch (m_op) {
        case LogIn:
            cJSON_AddItemToObject(obj, "op", cJSON_CreateString("in"));
            break;
        case LogOut:
            cJSON_AddItemToObject(obj, "op", cJSON_CreateString("out"));
            break;
        case Error:
            cJSON_AddItemToObject(obj, "op", cJSON_CreateString("err"));
            break;
    }
    cJSON_AddItemToObject(obj, "time", cJSON_CreateNumber(m_time));

    return obj;
}
