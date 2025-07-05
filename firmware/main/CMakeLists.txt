
idf_component_register(
    SRCS "WebApi.cpp" "main.cpp" "MFRC522.cpp" "SPI.cpp" "WiFi.cpp" "Config.cpp" "SpindleTime.cpp"
    INCLUDE_DIRS "./"
    REQUIRES esp_wifi
    REQUIRES driver
    REQUIRES json
    REQUIRES esp-tls
    REQUIRES app_update
    REQUIRES spi_flash esp_partition
    REQUIRES esp_http_client
    REQUIRES esp_https_ota
    REQUIRES nvs_flash
    )

