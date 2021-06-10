rem call "C:\Program Files\Git\usr\bin\openssl" genrsa -out MyRootCA.key 2048
rem call "C:\Program Files\Git\usr\bin\openssl" req -x509 -new -nodes -key MyRootCA.key -sha256 -days 1024 -out MyRootCA.pem 

call "C:\Program Files\Git\usr\bin\openssl" genrsa -out server.key 2048
call "C:\Program Files\Git\usr\bin\openssl" req -new -key server.key -out server.csr

call "C:\Program Files\Git\usr\bin\openssl" x509 -req -in server.csr -CA MyRootCA.pem -CAkey MyRootCA.key -CAcreateserial -out server.pem -days 1024 -sha256