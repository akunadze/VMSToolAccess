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
#include "WiFi.h"
#include "WebApi.h"
#include "Config.h"
#include "esp_log.h"
//#include "esp_heap_trace.h"
#include "driver/gpio.h"
#include "i2c-lcd1602.h"
#include "MFRC522.h"
#include "HID.h"

static const char *TAG = "main";

extern "C" {
    void app_main(void);
}

static void initI2C(void)
{
    int i2c_master_port = I2C_NUM_0;
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = 17,
        .scl_io_num = 16,
        .sda_pullup_en = GPIO_PULLUP_DISABLE,  // GY-2561 provides 10kΩ pullups
        .scl_pullup_en = GPIO_PULLUP_DISABLE,  // GY-2561 provides 10kΩ pullups
        .master = {
            .clk_speed = 100000
        },
        .clk_flags = 0
    };
    i2c_param_config(i2c_master_port, &conf);
    i2c_driver_install(i2c_master_port, I2C_MODE_MASTER, 0, 0, 0);
}

void lcdWriteJustified(i2c_lcd1602_info_t *lcd_info, const char *text, int row) {
    int len = strlen(text);
    int startChar = 0;

    if (len < 19) {
        startChar = (20 - len) / 2;
    }

    i2c_lcd1602_move_cursor(lcd_info, startChar, row);
    i2c_lcd1602_write_string(lcd_info, text);
}

void lcdWriteWrapped(i2c_lcd1602_info_t *lcd_info, const char *text, int row) {
    const char *start = text;

    while (*start && row < 4) {
        const char *lastSpace = NULL;
        const char *p = start;

        while (*p && (p - start < 20)) {
            if (*p == ' ') {
                lastSpace = p;
            }

            p++;
        }

        if (!*p) {
            lcdWriteJustified(lcd_info, start, row++);
            start = p;
        } else {
            char buf[50];
            const char *next = start;

            int copyLen = 0;
            if (lastSpace) {
                copyLen = lastSpace - start - 1;
                next = lastSpace + 1;
            } else {
                copyLen = 20;
                next = start + 20;
            }

            strncpy(buf, start, copyLen);
            buf[copyLen] = '\0';
            
            lcdWriteJustified(lcd_info, buf, row++);

            start = next;
        }
    }


    //     const char *last = start;
    //     const char *p = last;
    //     while (p && (p - start <= 20)) {
    //         last = p;
    //         if (*p) {
    //             p = strchr(p + 1, ' ');
    //             if (!p) {
    //                 p = last + strlen(last) + 1;
    //             }
    //         } else {
    //             p = NULL;
    //         }
    //     }

    //     if (last > start) {
    //         char buf[50];

    //         strncpy(buf, start, last - start);
    //         buf[last - start] = '\0';
            
    //         lcdWriteJustified(lcd_info, buf, row++);
    //         start = last + 1;
    //     } else {
    //         lcdWriteJustified(lcd_info, start, row++);
    //         break;
    //     }
    // }
}


MFRC522 rfid;
i2c_lcd1602_info_t *lcd_info = NULL;

bool detectCard() {
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
            char buf[30];

            sprintf(buf, " Reset in %d ", MAX_TIMEOUT - timeout);

            lcdWriteJustified(lcd_info, buf, 3);

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

void formatUid(char *buffer) {
    for (int i = 0; i < rfid.uid.size; i++) {
        sprintf(buffer + i*2, "%02x", rfid.uid.uidByte[i]);
    }
}

void app_main(void)
{
//    ESP_ERROR_CHECK( heap_trace_init_standalone(trace_record, NUM_RECORDS) );

    ESP_ERROR_CHECK(esp_event_loop_create_default());

    initI2C();

    Config config;
    WiFi wifi(config);

    HIDsetup();

    smbus_info_t * smbus_info = smbus_malloc();
    ESP_ERROR_CHECK(smbus_init(smbus_info, I2C_NUM_0, 0x27));
    ESP_ERROR_CHECK(smbus_set_timeout(smbus_info, pdMS_TO_TICKS(1000)));

    // Set up the LCD1602 device with backlight off
    lcd_info = i2c_lcd1602_malloc();
    ESP_ERROR_CHECK(i2c_lcd1602_init(lcd_info, smbus_info, true, 4, 20, 20));
    ESP_ERROR_CHECK(i2c_lcd1602_reset(lcd_info));

    i2c_lcd1602_set_backlight(lcd_info, true);
    lcdWriteJustified(lcd_info, "Connecting to WiFi", 1);

    while (!wifi.isConnected()) {
        ESP_LOGI(TAG, "Waiting for WiFi connection...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }

    rfid.PCD_Init(21, 22);

    WebApi api(config, wifi);

    while (true) {
        i2c_lcd1602_clear(lcd_info);
        lcdWriteJustified(lcd_info, "Scan door card", 1);
        HIDReset();

        HIDWaitForCard();
        if (HIDdecodeCard()) {
            char name[50];
            char doorCard[50];

            sprintf(doorCard, "%x:%d", HIDgetFacilityCode(), HIDgetCardCode());
            ESP_LOGI(TAG, "Doorcard %s", doorCard);

            i2c_lcd1602_clear(lcd_info);
            lcdWriteJustified(lcd_info, "Contacting server...", 1);

            auto query = api.queryCard(doorCard, name);

            i2c_lcd1602_clear(lcd_info);

            if (query == WebApi::RESULT::ERROR_MSG) {
                lcdWriteWrapped(lcd_info, name, 1);
            } else if (query == WebApi::RESULT::INTERNAL_ERROR) {
                lcdWriteJustified(lcd_info, "Internal error", 1);
            } else if (query == WebApi::RESULT::COMM_ERROR) {
                lcdWriteJustified(lcd_info, "Network error", 1);
            } else if (query == WebApi::RESULT::SUCCESS) {
                lcdWriteWrapped(lcd_info, name, 0);
                lcdWriteJustified(lcd_info, "Insert tool card", 2);

                if (detectCard()) {
                    char toolCard[50];                    
                    
                    rfid.PICC_HaltA();

                    formatUid(toolCard);

                    i2c_lcd1602_clear(lcd_info);
                    lcdWriteJustified(lcd_info, "Registering...", 1);

                    char errorMsg[50];
                    auto result = api.registerCard(doorCard, toolCard, errorMsg);

                    i2c_lcd1602_clear(lcd_info);
                    if (result == WebApi::RESULT::SUCCESS) {
                        lcdWriteJustified(lcd_info, "Success!", 0);
                        lcdWriteJustified(lcd_info, "Tool card is", 1);
                        lcdWriteJustified(lcd_info, "ready for use", 2);
                    } else if (result == WebApi::RESULT::ERROR_MSG) {
                        lcdWriteWrapped(lcd_info, errorMsg, 1);
                    } else if (result == WebApi::RESULT::INTERNAL_ERROR) {
                        lcdWriteJustified(lcd_info, "Internal error", 1);
                    } else if (result == WebApi::RESULT::COMM_ERROR) {
                        lcdWriteJustified(lcd_info, "Network error", 1);
                    }
                } else {
                    i2c_lcd1602_clear(lcd_info);
                    lcdWriteJustified(lcd_info, "Idle timeout", 1);
                    lcdWriteJustified(lcd_info, "Starting over", 2);
                }
            }
        } else {
            i2c_lcd1602_clear(lcd_info);
            lcdWriteJustified(lcd_info, "Scan error", 1);
            lcdWriteJustified(lcd_info, "Please try again", 2);
        }

        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
