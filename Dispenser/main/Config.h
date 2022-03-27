#pragma once

#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include <vector>
#include <string>

class Config {
public:
    Config();
    ~Config();

    const char *getWifiSid() { return m_wifiSid; }
    const char *getWifiPass() { return m_wifiPass; }
    const char *getMasterUrl() { return m_masterUrl; }
    const char *getMac() { return m_macAddress; }
    void setUsers(std::vector<std::string> &newUsers);
    bool isUserPresent(const char *cardId);

private:
    char m_wifiSid[32];
    char m_wifiPass[32];
    char m_masterUrl[32];
    char m_macAddress[32];
    std::vector<std::string> m_users;

    SemaphoreHandle_t m_semaphore;
};