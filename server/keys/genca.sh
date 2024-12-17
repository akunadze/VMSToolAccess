#!/bin/bash

# ========= Generating signing authority keys =========
echo "=========== Generating signing authority keys ======================="

# Generate the private key
openssl genrsa -out MyRootCA.key 2048

# Generate the self-signed certificate
openssl req -x509 -new -nodes -key MyRootCA.key -sha256 -days 1024 -out MyRootCA.pem

# ========= Generating firmware header file =========
echo "=========== Generating firmware header file =============="

# Creating the firmware header file
echo 'static const char *serverCert = R"~~~~(' > ../../firmware/main/ca_pem.h

# Append the certificate content to the header file
# The certificate is read and written as a single string literal
awk 'BEGIN { ORS=""; print "\"" } { print $0 "\\n" } END { print "\"" }' MyRootCA.pem >> ../../firmware/main/ca_pem.h

# Close the raw string literal
echo ')~~~~";' >> ../../firmware/main/ca_pem.h

echo "Header file generated at ../../firmware/main/ca_pem.h"