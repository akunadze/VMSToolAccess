#!/bin/bash

echo "============ Generating server keys. Input server IP when asked for CN ================="

openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -in server.csr -CA MyRootCA.pem -CAkey MyRootCA.key -CAcreateserial -out server.pem -days 1024 -sha256
