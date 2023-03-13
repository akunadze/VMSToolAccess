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

    const char *getWifiSid() const { return m_wifiSid; }
    const char *getWifiPass() const { return m_wifiPass; }
    const char *getMasterUrl() const { return m_masterUrl; }
    const char *getMac() const { return m_macAddress; }
    const char *getSyslogHost() const { return m_syslogHost; }
    uint16_t getSyslogPort() const { return m_syslogPort; }
    void setUsers(std::vector<std::string> &newUsers);
    bool isUserPresent(const char *cardId);

    static const int sVersion = 1;

private:
    char m_wifiSid[32];
    char m_wifiPass[32];
    char m_masterUrl[32];
    char m_macAddress[32];
    char m_syslogHost[32];
    uint16_t m_syslogPort;
    
    std::vector<std::string> m_users;

    SemaphoreHandle_t m_semaphore;
};