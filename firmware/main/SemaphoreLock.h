#pragma once

#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "esp_log.h"

class SemaphoreLock {
public:
    SemaphoreLock(SemaphoreHandle_t handle) : m_handle(handle) {
        xSemaphoreTake(handle, portMAX_DELAY);
    }

    ~SemaphoreLock() {
        xSemaphoreGive(m_handle);
    }

private:
    SemaphoreHandle_t m_handle;
};