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
//#include "esp_heap_trace.h"
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
            pThis->m_status = esp_http_client_get_status_code(pThis->m_hClient);
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
}

WebApi::~WebApi() {
}

WebApi::RESULT WebApi::queryCard(const char *doorCard, char *name) {
    auto obj = cJSON_CreateObject();
    cJSON_AddItemToObject(obj, "doorCard", cJSON_CreateString(doorCard));

    char *printed = cJSON_PrintUnformatted(obj);
    WebClient client(m_config, "/api/enroll/query", printed);
    
    client.waitForResponse();

    free(printed);
    cJSON_Delete(obj);

    RESULT result = RESULT::INTERNAL_ERROR;
    name[0] = '\0';

    if (client.getStatus() == 200) {
        ESP_LOGI(TAG, "%s", client.getResponse());

        auto json = cJSON_Parse(client.getResponse());
        if (json) {
            auto nameField = cJSON_GetObjectItem(json, "data");
            auto errorField = cJSON_GetObjectItem(json, "error");
            if (nameField && cJSON_IsString(nameField)) {
                strcpy(name, nameField->valuestring);
                result = RESULT::SUCCESS;
            } else if (errorField && cJSON_IsString(errorField)) {
                strcpy(name, errorField->valuestring);
                result = RESULT::ERROR_MSG;
            }
            
            cJSON_Delete(json);
        }
    } else {
        ESP_LOGE(TAG, "WebClient returned status %d", client.getStatus());
        result = RESULT::COMM_ERROR;
    }

    return result;
}

WebApi::RESULT WebApi::registerCard(const char *doorCard, const char *toolCard, char *errorMsg) {
    auto obj = cJSON_CreateObject();
    cJSON_AddItemToObject(obj, "doorCard", cJSON_CreateString(doorCard));
    cJSON_AddItemToObject(obj, "toolCard", cJSON_CreateString(toolCard));

    char *printed = cJSON_PrintUnformatted(obj);
    WebClient client(m_config, "/api/enroll/register", printed);
    
    client.waitForResponse();

    free(printed);
    cJSON_Delete(obj);

    RESULT result = RESULT::INTERNAL_ERROR;
    errorMsg[0] = '\0';

    if (client.getStatus() == 200) {
        ESP_LOGI(TAG, "%s", client.getResponse());

        auto json = cJSON_Parse(client.getResponse());
        if (json) {
            auto errorField = cJSON_GetObjectItem(json, "error");
            if (!errorField || cJSON_IsNull(errorField)) {
                result = RESULT::SUCCESS;
            } else if (errorField && cJSON_IsString(errorField)) {
                strcpy(errorMsg, errorField->valuestring);
                result = RESULT::ERROR_MSG;
            }
            
            cJSON_Delete(json);
        }
    } else {
        ESP_LOGE(TAG, "WebClient returned status %d", client.getStatus());
        result = RESULT::COMM_ERROR;
    }

    return result;
}

