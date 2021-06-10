#include "nvs_flash.h"
#include "esp_system.h"
#include "Config.h"
#include "SemaphoreLock.h"

Config::Config() : 
    m_wifiSid{0}, m_wifiPass{0}, m_masterUrl{0}, m_macAddress{0}
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
      ESP_ERROR_CHECK(nvs_flash_erase());
      ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    nvs_handle_t hNvs;
    ESP_ERROR_CHECK(nvs_open("config", NVS_READWRITE, &hNvs));

    size_t strLen = sizeof(m_wifiSid);
    ESP_ERROR_CHECK(nvs_get_str(hNvs, "wifiSid", m_wifiSid, &strLen));
    strLen = sizeof(m_wifiPass);
    ESP_ERROR_CHECK(nvs_get_str(hNvs, "wifiPass", m_wifiPass, &strLen));
    strLen = sizeof(m_masterUrl);
    ESP_ERROR_CHECK(nvs_get_str(hNvs, "masterUrl", m_masterUrl, &strLen));

    nvs_close(hNvs);

    uint8_t mac[6];
    ret = esp_efuse_mac_get_default(mac);
    ESP_ERROR_CHECK(ret);
    if (ret == ESP_OK) {
        sprintf(m_macAddress, "%02x:%02x:%02x:%02x:%02x:%02x",mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    }

    m_semaphore = xSemaphoreCreateBinary();
    xSemaphoreGive(m_semaphore);
}

Config::~Config() {
}

void Config::setUsers(std::vector<std::string> &newUsers) {
    SemaphoreLock lock(m_semaphore);

    m_users = newUsers;
}

bool Config::isUserPresent(const char *cardId) {
    SemaphoreLock lock(m_semaphore);

    for (auto it = m_users.begin(); it != m_users.end(); it++) {
        if (*it == cardId) {
            return true;
        }
    }

    return false;
}
