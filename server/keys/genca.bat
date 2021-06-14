@echo off

echo ============ Generating signing authority keys =======================
call "C:\Program Files\Git\usr\bin\openssl" genrsa -out MyRootCA.key 2048
call "C:\Program Files\Git\usr\bin\openssl" req -x509 -new -nodes -key MyRootCA.key -sha256 -days 1024 -out MyRootCA.pem 

echo ============ Generating firmware header file ==============
echo static const char *serverCert = R^"~~~~( > ..\..\firmware\main\ca_pem.h
type MyRootCA.pem >> ..\..\firmware\main\ca_pem.h
echo )~~~~^"; >> ..\..\firmware\main\ca_pem.h
