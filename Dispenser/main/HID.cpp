/*
 * HID RFID Reader Wiegand Interface for Arduino Uno
 * Originally by  Daniel Smith, 2012.01.30 -- http://www.pagemac.com/projects/rfid/arduino_wiegand
 * 
 * Updated 2016-11-23 by Jon "ShakataGaNai" Davis.
 * See https://obviate.io/?p=7470 for more details & instructions
*/
 
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/timers.h"
#include "driver/gpio.h"
#include "esp_log.h"
//#include "esp_heap_trace.h"
#include "HID.h"

static const char *TAG = "HID";

#define MAX_BITS 100                 // max number of bits 
#define WEIGAND_WAIT_TIME  3000      // time to wait for another weigand pulse.  
 
unsigned char databits[MAX_BITS];    // stores all of the data bits
unsigned char bitCount;              // number of bits currently captured
TickType_t waitStart;

unsigned long facilityCode=0;        // decoded facility code
unsigned long cardCode=0;            // decoded card code

TimerHandle_t doneTimer;

int LED_GREEN = 11;
int LED_RED = 12;
int BEEP_BEEP = 10;

// interrupt that happens when INTO goes low (0 bit)
static void IRAM_ATTR dataISR(void* arg) {
    databits[bitCount] = *((unsigned char *)&arg);
    bitCount++;

    waitStart = xTaskGetTickCountFromISR();
}

void HIDsetup() {
    gpio_config_t inputConfig = {
        .pin_bit_mask = GPIO_SEL_25 | GPIO_SEL_26,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_NEGEDGE
    };

    gpio_config(&inputConfig);

    gpio_install_isr_service(0);
    gpio_isr_handler_add(GPIO_NUM_25, dataISR, (void *)1);
    gpio_isr_handler_add(GPIO_NUM_26, dataISR, (void *)0);

    HIDReset();
}

void HIDWaitForCard()
{
    while (!waitStart || (xTaskGetTickCount() - waitStart < pdMS_TO_TICKS(1000))) {
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

bool HIDdecodeCard()
{
    bool valid = false;
    
    facilityCode = cardCode = 0;

    // if we have bits and we the weigand counter went out
    if (bitCount > 0) {
        ESP_LOGI(TAG, "Read %d bits. Done.", bitCount);

        char bits[bitCount + 1];

        for (int i = 0; i < bitCount; i++) {
            bits[i] = databits[i] ? '1' : '0';
        }
        bits[bitCount] = '\0';

        ESP_LOGI(TAG, "Bits: %s", bits);

        if (bitCount == 35) {
            // 35 bit HID Corporate 1000 format
            // facility code = bits 2 to 14
            for (int i=2; i<14; i++) {
                facilityCode <<=1;
                facilityCode |= databits[i];
            }

            // card code = bits 15 to 34
            for (int i=14; i<34; i++) {
                cardCode <<=1;
                cardCode |= databits[i];
            }

            ESP_LOGI(TAG, "FC = %lu, CC = %lu", facilityCode, cardCode);
        
            valid = true;
        } else if (bitCount == 26) {
            // standard 26 bit format
            // facility code = bits 2 to 9
            for (int i=1; i<9; i++) {
                facilityCode <<=1;
                facilityCode |= databits[i];
            }

            // card code = bits 10 to 23
            for (int i=9; i<25; i++) {
                cardCode <<=1;
                cardCode |= databits[i];
            }

            ESP_LOGI(TAG, "FC = %lu, CC = %lu", facilityCode, cardCode);

            valid = true;
        } else {
            // you can add other formats if you want!
            // Serial.println("Unable to decode."); 
            ESP_LOGI(TAG, "Unknown bit count: %d", bitCount);
        }

        // cleanup and get ready for the next card
        bitCount = 0;
    }

    return valid;
}

int HIDgetFacilityCode() {
    return facilityCode;
}

int HIDgetCardCode() {
    return cardCode;
}
 
void HIDReset() {
    waitStart = 0;
    facilityCode = 0;
    cardCode = 0;
    bitCount = 0;
}
