#!/bin/bash

# Set the IDF_PATH (you'll need to specify the correct path here)
#export IDF_PATH="/path/to/your/esp-idf"

# Generate the NVS partition
$IDF_PATH/components/nvs_flash/nvs_partition_generator/nvs_partition_gen.py generate main/nvs.csv nvs.bin 0x4000

# Check if the previous command was successful
if [ $? -eq 0 ]; then
    # Replace /dev/tty.usbmodemXXXX with your actual serial port (example: /dev/tty.usbmodem14101)
    parttool.py -b 115200 -p /dev/tty.usbserial-0001 write_partition --partition-name nvs --input nvs.bin
fi
