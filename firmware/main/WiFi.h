#pragma once

#include "esp_event.h"

class Config;

class WiFi {
public:
    WiFi(Config &conf);
    ~WiFi();

    bool isConnected() { return m_bConnected; }

private:
    Config &m_config;
    bool m_bConnected;
    esp_event_handler_instance_t m_evenInstanceAnyId;
    esp_event_handler_instance_t m_eventInstanceGotIp;

    static void eventHandler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data);
};
