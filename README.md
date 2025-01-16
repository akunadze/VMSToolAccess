# Victoria Makerspace Tool Access Portal

## Initial setup

The following tools are needed:
1. VSCode
2. Node.js
3. ESP-IDF VSCode extension (for firmware build)

First, generate server cert and keys:

1. cd \<repo root>/server/keys
2. If you've just cloned the repo, run genca.bat. You can accept default values for everything.
3. Run genkeys.bat. It'll ask a bunch of questions about country, state, city, etc. You can skip all of them except the CN (common name). Put the IP address of the server in that, otherwise HTTPS connection won't work.

Now, compile the server:

1. cd \<repo root>/server
2. npm i
3. tsc

Initialize the front-end

1. cd \<repo root>
2. npm i

## Dev environment

Open two command windows.

In the first one:
1. cd \<repo root>/server
2. nodemon

In the second:
1. cd \<repo root>
2. npm run serve

Now you can navigate your browser to https://localhost:8080 to access the site.

Any changes to front-end code would be picked up automatically.
Any changes to server code require "tsc" to be run

## Production build

If you're deploying to a separate server, you'll need to generate keys with the correct IP address of the server (see above)

1. cd \<repo root>/server
2. tsc
3. cd \<repo root>
4. npm run build
5. stage.bat

At this point you can copy the contents of \<repo root>/stage to the server. Once deployed, 
1. cd \<deplyment root>/server
2. node src/server.js
3. Navigate to https://\<server IP>:3080

## Firmware build

Open \<repo root>/firmware directory in VSCode
Follow the normal ESP-IDF build and deploy procedures
Note that firware package includes the cert of the signing authority that's been generated when genca.bat was run.

Last step is to flash provisioning data to the device:
1. Edit \<repo root>/firmware/main/nvs.csv. Provide the correct values for WiFi SSID/pass and the IP of your server
2. Open ESP-IDF Terminal in VSCode
3. Make sure you're in \<repo root>/firmware directory and run burnSettings.cmd. Hold down "boot" button on the ESP board to allow the flash to happen


## OSX Instrustions
Do certificate generation
genca.sh
genkeys.sh
copy  server.key and server.pem to server directory
create data directory in server path


open terminal in vscode
export esp-idf environment paths

cd ~/esp/esp-idf
. ./export.sh

Change to firmware build directory
verify setting and flash size with idf.py menuconfig 
idf.py build clean
edit nvs.csv with required wifi credentials
run burnsettings.sh  you might need to change the port the usb is on.
idf.py flash

Server
npx nodemon

Client
npm serve
