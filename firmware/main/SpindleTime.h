#pragma once

#include "freertos/FreeRTOS.h"
//#include "freertos/task.h"
#include "GPIO.h"
#include <memory>

class SpindleTime {
public:
    static constexpr gpio_num_t SPINDLE_PIN = GPIO_NUM_33;

    SpindleTime() {
        m_lock.reset(new portMUX_TYPE);
        portMUX_INITIALIZE(m_lock.get());
    }

    bool init();

    static void IRAM_ATTR spindleHandler(void* arg);

    uint32_t getTime();
    void resetTime();
    void updateTime();

    void setRecord(bool on);

private:
    inline static std::unique_ptr<portMUX_TYPE> m_lock;
    
    bool m_recordSpindleTime = false;
    uint32_t m_spindleTime = 0;
    bool m_spindleOn = false;
    TickType_t m_spindleOnTime = 0;

    int getSpindleState() {
        return (gpio_get_level(SPINDLE_PIN) ? 0 : 1);
    }
};