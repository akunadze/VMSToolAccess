@echo off

echo ============ Generating server keys. Input server IP when asked for CN =================
call "C:\Program Files\Git\usr\bin\openssl" genrsa -out server.key 2048
call "C:\Program Files\Git\usr\bin\openssl" req -new -key server.key -out server.csr
call "C:\Program Files\Git\usr\bin\openssl" x509 -req -in server.csr -CA MyRootCA.pem -CAkey MyRootCA.key -CAcreateserial -out server.pem -days 1024 -sha256
