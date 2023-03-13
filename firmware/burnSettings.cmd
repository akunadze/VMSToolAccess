%IDF_PATH%\components\nvs_flash\nvs_partition_generator\nvs_partition_gen.py generate main/nvs.csv nvs.bin 0x4000
parttool.py -p COM6 write_partition --partition-name nvs --input nvs.bin