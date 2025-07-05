/* Hello World Example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/
#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_spi_flash.h"
#include "esp_event.h"
#include "MFRC522.h"
#include "WiFi.h"
#include "WebApi.h"
#include "Config.h"
#include "esp_log.h"
#include "esp_heap_trace.h"
#include "nvs_flash.h"
#include "SpindleTime.h"
//#include "Syslog.h"

#include "led_strip.h"

static const char *TAG = "main";

MFRC522 rfid;

char currentCard[21];
MFRC522::Uid currentUid;

void formatUid(char *buffer) {
    for (int i = 0; i < rfid.uid.size; i++) {
        sprintf(buffer + i*2, "%02x", rfid.uid.uidByte[i]);
    }
}

bool isCardStillThere() {
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);

    int status = rfid.PICC_WakeupA(bufferATQA, &bufferSize);
    if (status == MFRC522::STATUS_OK) {
        status = rfid.PICC_Select(&currentUid, currentUid.size * 8);
        if (status == MFRC522::STATUS_OK) {
            rfid.PICC_HaltA();
            return true;
        } else {
            ESP_LOGD(TAG, "PICC_Select returned %d\n", status);
        }
    } else {
        ESP_LOGD(TAG, "PICC_WakeupA returned %d\n", status);
    }

    return false;
}

bool detectCard() {
    byte lastUid[10];
    byte lastUidSize = 0;
    int matches = 0;

    while (true) {
        if (rfid.PICC_IsNewCardPresent()) {
            ESP_LOGI(TAG, "New card present");
            if (rfid.PICC_ReadCardSerial()) {
                ESP_LOGI(TAG, "Serial read");
                if (rfid.uid.size == lastUidSize && !memcmp(lastUid, rfid.uid.uidByte, lastUidSize)) {
                    matches++;
                    ESP_LOGI(TAG, "Matches: %d", matches);

                    if (matches > 4) {
                        return true;
                    }
                } else {
                    lastUidSize = rfid.uid.size;
                    memcpy(lastUid, rfid.uid.uidByte, lastUidSize);
                    matches = 1;
                }
            } else {
                lastUidSize = 0;
                matches = 0;
            }
        } else {
            vTaskDelay(pdMS_TO_TICKS(100));
        }
    }
}

void setAccess(bool enable) {
    gpio_set_level((gpio_num_t)16, enable);
}

extern "C" {
    void app_main(void);
}

// #define NUM_RECORDS 100
// static heap_trace_record_t trace_record[NUM_RECORDS]; // This buffer must be in internal RAM

#define LIGHSHOW_STEPS  128

uint8_t morph(uint8_t start, uint8_t end, uint8_t step) {
    uint8_t result = (uint8_t)((int)start + (((int)end - (int)start) * step / LIGHSHOW_STEPS));
    //ESP_LOGI(TAG, "Step: %d, result: %d", step, result);
    return result;
}

static bool bStopLightShow = false;
void lightShowTask(void *pvParam) {
    led_strip_handle_t pLeds = (led_strip_handle_t)pvParam;

    uint8_t r1 = 255;
    uint8_t g1 = 0;
    uint8_t b1 = 128;
    
    uint8_t r2 = 0;
    uint8_t g2 = 255;
    uint8_t b2 = 128;
    
    uint8_t step = 0;
    int8_t stepInc = 1;

    while (true) {
        if (bStopLightShow) {
            vTaskDelete(NULL);
        }
    

        led_strip_set_pixel(pLeds, 0, morph(r1, r2, step), morph(g1, g2, step), morph(b1, b2, step));
        led_strip_refresh(pLeds);

        if ((step == 0 && stepInc == -1) || (step == LIGHSHOW_STEPS && stepInc == 1)) {
            stepInc = 0 - stepInc;
        }

        step += stepInc;

        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void saveActiveCardAndSpindleTime(const char *card, uint32_t spindleTime) {
    nvs_handle_t hNvs;
    ESP_ERROR_CHECK(nvs_open("config", NVS_READWRITE, &hNvs));

    ESP_ERROR_CHECK(nvs_set_str(hNvs, "activeCard", card));
    ESP_ERROR_CHECK(nvs_set_i64(hNvs, "activeCardTime", time(NULL)));
    ESP_ERROR_CHECK(nvs_set_u32(hNvs, "spindleTime", spindleTime));

    nvs_close(hNvs);
}

bool getActiveCardAndSpindleTime(char *cardBuffer, size_t bufferSize, time_t &timestamp, uint32_t &spindleTime) {
    nvs_handle_t hNvs;
    ESP_ERROR_CHECK(nvs_open("config", NVS_READWRITE, &hNvs));

    bool bFound = false;

    if (nvs_get_str(hNvs, "activeCard", cardBuffer, &bufferSize) == ESP_OK) {
        if (strlen(cardBuffer) > 0 &&
            nvs_get_i64(hNvs, "activeCardTime", (int64_t *)&timestamp) == ESP_OK) 
        {
            ESP_ERROR_CHECK(nvs_get_u32(hNvs, "spindleTime", &spindleTime));
            bFound = true;
        }
    }

    nvs_close(hNvs);

    return bFound;
}

led_strip_handle_t initLED() {
    led_strip_handle_t led_strip;

    /* LED strip initialization with the GPIO and pixels number*/
    led_strip_config_t strip_config;
    
    strip_config.strip_gpio_num = GPIO_NUM_32; // The GPIO that connected to the LED strip's data line
    strip_config.max_leds = 1; // The number of LEDs in the strip,
    strip_config.led_pixel_format = LED_PIXEL_FORMAT_GRB; // Pixel format of your LED strip
    strip_config.led_model = LED_MODEL_WS2812; // LED strip model
    strip_config.flags.invert_out = false; // whether to invert the output signal (useful when your hardware has a level inverter)

    led_strip_rmt_config_t rmt_config;
    rmt_config.clk_src = RMT_CLK_SRC_DEFAULT; // different clock source can lead to different power consumption
    rmt_config.resolution_hz = 10 * 1000 * 1000; // 10MHz
    rmt_config.flags.with_dma = false; // whether to enable the DMA feature
    rmt_config.mem_block_symbols = 64; // how many RMT symbols can one RMT channel hold at one time, set to 0 will fallback to use the default size

    led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip);
    led_strip_clear(led_strip); // Clear the strip to turn off all LEDs

    return led_strip;
}

void app_main(void)
{
//    ESP_ERROR_CHECK( heap_trace_init_standalone(trace_record, NUM_RECORDS) );

    ESP_ERROR_CHECK(esp_event_loop_create_default());

    Config config;
    //Syslog syslog(config);
    WiFi wifi(config);

	gpio_set_direction((gpio_num_t)16, GPIO_MODE_OUTPUT);

    led_strip_handle_t led_strip = initLED();

    bool ledPhase = true;
    led_strip_set_pixel(led_strip, 0, ledPhase ? 255 : 0, ledPhase ? 0 : 255, 0);
    led_strip_refresh(led_strip);

    rfid.PCD_Init(21, 22);

    while (!wifi.isConnected()) {
        ledPhase = !ledPhase;
        led_strip_set_pixel(led_strip, 0, ledPhase ? 255 : 0, ledPhase ? 0 : 255, 0);
        led_strip_refresh(led_strip);
        ESP_LOGI(TAG, "Waiting for WiFi connection...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }

    WebApi api(config, wifi);
    api.startHelloTask();

    char savedCard[64];
    time_t savedTime;
    uint32_t savedSpindleTime;
    if (getActiveCardAndSpindleTime(savedCard, sizeof(savedCard), savedTime, savedSpindleTime)) {
        ESP_LOGI(TAG, "Sending a tardy logout...");
        api.addLog(savedCard, LogEntry::LogOut, savedTime, savedSpindleTime);
        saveActiveCardAndSpindleTime("", 0);
    }

    gpio_install_isr_service(0);

    SpindleTime spindleTime;
    spindleTime.init();

    while (true) {
        bStopLightShow = false;
        xTaskCreate(&lightShowTask, "LightShowTask", 2048, led_strip, 5, NULL);

        ESP_LOGI(TAG, "Waiting for a card...");
        if (detectCard()) {
            bStopLightShow = true;

            rfid.PICC_HaltA();

            ESP_LOGI(TAG, "New card detected\n");

            formatUid(currentCard);
            currentUid = rfid.uid;
            
            ESP_LOGI(TAG, "UUID read: %s\n", currentCard);

            bool bAuthorized = false;

            if (config.isUserPresent(currentCard)) {
                led_strip_set_pixel(led_strip, 0, 0, 255, 0);
                led_strip_refresh(led_strip);

                ESP_LOGW(TAG, "User authorized");
                bAuthorized = true;
                api.addLog(currentCard, LogEntry::LogIn);

                spindleTime.resetTime();
                spindleTime.setRecord(true);
            } else {
                led_strip_set_pixel(led_strip, 0, 255, 0, 0);
                led_strip_refresh(led_strip);

                ESP_LOGW(TAG, "User NOT authorized");
                bAuthorized = false;
                api.addLog(currentCard, LogEntry::Error);
            }
            
            setAccess(bAuthorized);

            while (isCardStillThere()) {
                if (bAuthorized) {
                    spindleTime.updateTime();
                    saveActiveCardAndSpindleTime(currentCard, spindleTime.getTime());
                }
                vTaskDelay(pdMS_TO_TICKS(1000));
            }

            if (bAuthorized) {
                spindleTime.setRecord(false);
                setAccess(false);
                api.addLog(currentCard, LogEntry::LogOut, time(NULL), spindleTime.getTime());
                saveActiveCardAndSpindleTime("", 0);
            }
            
            currentCard[0] = 0;
            currentUid.size = 0;

            ESP_LOGI(TAG, "Card removed\n");
        }
    }
}
