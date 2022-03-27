# Embed the server root certificate into the final binary
#
# (If this was a component, we would set COMPONENT_EMBED_TXTFILES here.)
idf_component_register(SRCS "main.cpp" "WebApi.cpp" "Config.cpp" "WiFi.cpp" "HID.cpp" "MFRC522.cpp" "SPI.cpp"
                    INCLUDE_DIRS "."
                    )

