mkdir stage
mkdir stage\frontend
mkdir stage\frontend\dist
xcopy /S frontend\dist stage\frontend\dist
mkdir stage\server
mkdir stage\server\data
mkdir stage\server\src
copy server\src\*.js stage\server\src
copy server\server.key stage\server
copy server\server.pem stage\server
copy server\package.json stage\server
