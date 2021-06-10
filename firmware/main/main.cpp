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

#include "WS2812.h"

static const char *TAG = "main";

MFRC522 rfid;

char currentCard[21];
MFRC522::Uid currentUid;

void formatUid(char *buffer) {
    for (int i = 0; i < rfid.uid.size; i++) {
        sprintf(buffer + i*2, "%x", rfid.uid.uidByte[i]);
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

void app_main(void)
{
//    ESP_ERROR_CHECK( heap_trace_init_standalone(trace_record, NUM_RECORDS) );

    ESP_ERROR_CHECK(esp_event_loop_create_default());

    // WS2812 leds((gpio_num_t)32, 2);

    // leds.setPixel(0, 255, 0, 0);
    // leds.setPixel(1, 0, 0, 255);
    //     leds.show();

	gpio_set_direction((gpio_num_t)16, GPIO_MODE_OUTPUT);

    Config config;
    WiFi wifi(config);

    rfid.PCD_Init(21, 22);

    while (!wifi.isConnected()) {
        ESP_LOGI(TAG, "Waiting for WiFi connection...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }

    WebApi api(config, wifi);
    api.startHelloTask();

    while (true) {
        ESP_LOGI(TAG, "Waiting for a card...");
        if (detectCard()) {
            rfid.PICC_HaltA();

            ESP_LOGI(TAG, "New card detected\n");

            formatUid(currentCard);
            currentUid = rfid.uid;
            
            ESP_LOGI(TAG, "UUID read: %s\n", currentCard);

            bool bAuthorized = false;

            if (config.isUserPresent(currentCard)) {
                ESP_LOGW(TAG, "User authorized");
                bAuthorized = true;
                api.addLog(currentCard, LogEntry::LogIn);
            } else {
                ESP_LOGW(TAG, "User NOT authorized");
                bAuthorized = false;
                api.addLog(currentCard, LogEntry::Error);
            }

            setAccess(bAuthorized);

            while (isCardStillThere()) {
                vTaskDelay(pdMS_TO_TICKS(1000));
            }

            if (bAuthorized) {
                setAccess(false);
                api.addLog(currentCard, LogEntry::LogOut);
            }
            
            currentCard[0] = 0;
            currentUid.size = 0;

            ESP_LOGI(TAG, "Card removed\n");
        }
    }
}
