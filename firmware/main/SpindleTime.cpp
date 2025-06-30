#include "SpindleTime.h"
#include <GPIO.h>

bool SpindleTime::init() {
    gpio_reset_pin(SPINDLE_PIN);
    gpio_set_direction(SPINDLE_PIN, GPIO_MODE_INPUT);
    gpio_set_pull_mode(SPINDLE_PIN, GPIO_PULLUP_ONLY);

    // Set up GPIO interrupt on falling edge (button press)
    gpio_set_intr_type(SPINDLE_PIN, GPIO_INTR_ANYEDGE);
    gpio_isr_handler_add(SPINDLE_PIN, SpindleTime::spindleHandler, this);

    return true;
}


void IRAM_ATTR SpindleTime::spindleHandler(void* arg) {
    SpindleTime *sp = (SpindleTime *)arg;
    uint32_t level = sp->getSpindleState();
    TickType_t ticks = xTaskGetTickCountFromISR();

    taskENTER_CRITICAL_ISR(sp->m_lock.get());

    if (sp->m_recordSpindleTime) {
        if ((bool)level != sp->m_spindleOn) {
            sp->m_spindleOn = !sp->m_spindleOn;

            if (sp->m_spindleOn) {
                sp->m_spindleOnTime = ticks;
            } else {
                uint32_t timeSlice = ticks - sp->m_spindleOnTime;
                sp->m_spindleTime += timeSlice;
            }
        }

    }

    taskEXIT_CRITICAL_ISR(sp->m_lock.get());
}

void SpindleTime::setRecord(bool on) {
    TickType_t ticks = xTaskGetTickCount();

    taskENTER_CRITICAL(m_lock.get());

    if (m_recordSpindleTime == on) {
        return;
    }

    if (on) {
        m_spindleOn = getSpindleState();
        if (m_spindleOn) {
            m_spindleOnTime = ticks;
        } else {
            m_spindleOnTime = 0;
        }
        m_recordSpindleTime = true;
    } else {
        m_recordSpindleTime = false;

        if (m_spindleOn) {
            uint32_t timeSlice = ticks - m_spindleOnTime;
            m_spindleTime += timeSlice;
        }

        m_spindleOn = false;
        m_spindleOnTime = 0;
    }

    taskEXIT_CRITICAL(m_lock.get());
}

uint32_t SpindleTime::getTime() {
    uint32_t ret;
    taskENTER_CRITICAL(m_lock.get());
    ret = m_spindleTime;
    taskEXIT_CRITICAL(m_lock.get());
    return ret;
}

void SpindleTime::resetTime() {
    uint32_t ret;
    taskENTER_CRITICAL(m_lock.get());
    m_spindleTime = 0;
    taskEXIT_CRITICAL(m_lock.get());
}

void SpindleTime::updateTime() {
    TickType_t ticks = xTaskGetTickCount();

    taskENTER_CRITICAL(m_lock.get());
    if (m_recordSpindleTime && m_spindleOn) {
        uint32_t timeSlice = ticks - m_spindleOnTime;
        m_spindleTime += timeSlice;
        m_spindleOnTime = ticks;
    }
    taskEXIT_CRITICAL(m_lock.get());
}

