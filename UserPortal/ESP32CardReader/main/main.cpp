/*
 * SPDX-FileCopyrightText: 2010-2022 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: CC0-1.0
 */

#include <stdio.h>
#include <inttypes.h>
#include <memory.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "MFRC522.h"
#include "HID.h"

extern "C" {
    void app_main(void);
}

static const char *TAG = "main";

typedef enum {
    CARD_TYPE_HID,
    CARD_TYPE_MIFARE,
} CardType;

typedef struct {
    CardType type;
    char uid[50];
} CardEvent;

static QueueHandle_t cardQueue;

// ---- Mifare (MFRC522) task ----

static MFRC522 rfid;

static bool detectCard() {
    byte lastUid[10];
    byte lastUidSize = 0;
    int matches = 0;

    int lastTimeout = 15;
    int startTime = xTaskGetTickCount();
    const int MAX_TIMEOUT = 15;

    while (true) {
        int timeout = pdTICKS_TO_MS((xTaskGetTickCount() - startTime)) / 1000;
        if (timeout != lastTimeout) {
            lastTimeout = timeout;
            if (timeout > MAX_TIMEOUT) {
                return false;
            }
        }

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

static void formatUid(char *buffer) {
    for (int i = 0; i < rfid.uid.size; i++) {
        sprintf(buffer + i*2, "%02x", rfid.uid.uidByte[i]);
    }
}

static void mifareTask(void *pvParameters) {
    rfid.PCD_Init(21, 22);

    while (true) {
        if (detectCard()) {
            CardEvent event;
            event.type = CARD_TYPE_MIFARE;
            rfid.PICC_HaltA();
            formatUid(event.uid);
            xQueueSend(cardQueue, &event, portMAX_DELAY);
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ---- HID task ----

static void hidTask(void *pvParameters) {
    HIDsetup();

    while (true) {
        HIDReset();
        HIDWaitForCard();
        if (HIDdecodeCard()) {
            CardEvent event;
            event.type = CARD_TYPE_HID;
            sprintf(event.uid, "%x:%d", HIDgetFacilityCode(), HIDgetCardCode());
            xQueueSend(cardQueue, &event, portMAX_DELAY);
        }
    }
}

// ---- Main ----

void app_main(void) {
    cardQueue = xQueueCreate(10, sizeof(CardEvent));

    xTaskCreate(hidTask,    "hid_task",    4096, NULL, 5, NULL);
    xTaskCreate(mifareTask, "mifare_task", 4096, NULL, 5, NULL);

    while (true) {
        CardEvent event;
        if (xQueueReceive(cardQueue, &event, portMAX_DELAY)) {
            char buffer[100];

            if (event.type == CARD_TYPE_HID) {
                sprintf(buffer, "CMD:>>Door card: %s", event.uid);
            } else {
                sprintf(buffer, "CMD:>>Tool card: %s", event.uid);
            }

            printf("%s\n", buffer);
        }
    }
}
