"""
Standalone kiosk server entry point — Python equivalent of server.js.

Used for flutterpi deployments (no Electron). The Electron build spawns this
script as a subprocess via main.js instead.

Card scans are read from the ESP32CardReader firmware via a USB serial port
(default /dev/ttyUSB0). The firmware writes one line per scan:
    CMD:>>Door card: <uid>
    CMD:>>Tool card: <uid>

Environment variables:
    KIOSK_PORT          Local HTTP port (default: 4000)
    FLUTTER_WEB_DIR     Path to Flutter web build to serve (optional)
    TOOLACCESS_SERVER   Hostname of the main server (default: localhost)
    KIOSK_SECRET        Shared secret for X-Kiosk-Secret header
    KIOSK_ENV           Set to 'production' to disable dev simulate endpoints
    SERIAL_PORT         Serial device for card reader (default: /dev/ttyUSB0)
    SERIAL_BAUD         Baud rate for serial port (default: 115200)
"""

import os
import signal
import sys

import uvicorn

# Allow importing sibling modules when run as a script
sys.path.insert(0, os.path.dirname(__file__))

from hardware import SerialCardReader
from kiosk_server import create_app

PORT = int(os.environ.get('KIOSK_PORT', '4000'))
FLUTTER_WEB_DIR = os.environ.get('FLUTTER_WEB_DIR')

card_reader = SerialCardReader()
card_reader.open()


def shutdown(sig, frame):
    print('[KioskServer] Shutting down...')
    card_reader.close()
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

app = create_app(card_reader.door, card_reader.tool, flutter_web_dir=FLUTTER_WEB_DIR)

if __name__ == '__main__':
    print(f'[KioskServer] Listening on port {PORT}', flush=True)
    uvicorn.run(app, host='0.0.0.0', port=PORT, log_level='warning')
