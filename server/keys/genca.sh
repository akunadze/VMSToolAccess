#!/bin/bash

# ========= Generating signing authority keys =========
echo "=========== Generating signing authority keys ======================="

# Generate the private key
openssl genrsa -out MyRootCA.key 2048

# Generate the self-signed certificate
openssl req -x509 -new -nodes -key MyRootCA.key -sha256 -days 1024 -out MyRootCA.pem

# ========= Generating firmware header file =========
echo "=========== Generating firmware header file =============="

#!/bin/bash

# Define the target file
TARGET_FILE="../../firmware/main/ca_pem.h"

# Append the beginning of the raw string
echo 'static const char *serverCert = R"~~~~(' > "$TARGET_FILE"

# Append the contents of the PEM file
cat MyRootCA.pem >> "$TARGET_FILE"

# Append the closing delimiter for the raw string
echo ')~~~~";' >> "$TARGET_FILE"

echo "Header file generated at ../../firmware/main/ca_pem.h"