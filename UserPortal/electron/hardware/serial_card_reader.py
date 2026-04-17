"""
Serial card reader — reads door and tool card scans from a single serial port.

The ESP32CardReader firmware writes one line per scan:
    CMD:>>Door card: <uid>    — HID/Wiegand card  (format: <facility_hex>:<card_decimal>)
    CMD:>>Tool card: <uid>    — Mifare/MFRC522 card (format: lowercase hex bytes)

Environment variables:
    SERIAL_PORT     Serial device path  (default: /dev/ttyUSB0)
    SERIAL_BAUD     Baud rate           (default: 115200)
"""

import os
import threading
import time
from typing import Callable, Dict, List, Optional

try:
    import serial as _serial
    _SERIAL_AVAILABLE = True
except ImportError:
    _SERIAL_AVAILABLE = False

_DOOR_PREFIX = 'CMD:>>Door card: '
_TOOL_PREFIX = 'CMD:>>Tool card: '


class _SubReader:
    """
    Thin event emitter that represents one card-reader channel (door or tool).

    Implements the same interface as DoorCardReader / ToolCardReader so that
    kiosk_server.py does not need to change:
        reader.on('card', callback)
        reader.simulate_scan(card_id)
    """

    def __init__(self, name: str) -> None:
        self._name = name
        self._listeners: Dict[str, List[Callable]] = {}

    def on(self, event: str, callback: Callable) -> None:
        self._listeners.setdefault(event, []).append(callback)

    def _emit(self, event: str, data) -> None:
        for cb in self._listeners.get(event, []):
            cb(data)

    def simulate_scan(self, card_id: str) -> None:
        """Inject a card scan without hardware. Used by dev simulate endpoints."""
        self._emit('card', {'cardId': card_id, 'timestamp': int(time.time() * 1000)})


class SerialCardReader:
    """
    Reads card scans from the ESP32CardReader firmware over a serial port.

    After calling open(), a background thread continuously reads lines from the
    serial port and dispatches events to .door or .tool sub-readers.

    Usage:
        reader = SerialCardReader()
        reader.open()
        app = create_app(reader.door, reader.tool, ...)
        ...
        reader.close()
    """

    def __init__(
        self,
        port: Optional[str] = None,
        baud: Optional[int] = None,
    ) -> None:
        self._port = port or os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
        self._baud = baud or int(os.environ.get('SERIAL_BAUD', '115200'))

        self.door = _SubReader('door')
        self.tool = _SubReader('tool')

        self._is_open = False
        self._serial: Optional[object] = None
        self._thread: Optional[threading.Thread] = None

    @property
    def is_open(self) -> bool:
        return self._is_open

    def open(self) -> None:
        if not _SERIAL_AVAILABLE:
            print('[SerialCardReader] pyserial not installed — running as stub (simulate_scan only)')
            self._is_open = True
            return

        try:
            self._serial = _serial.Serial(self._port, self._baud, timeout=1)
        except Exception as exc:
            print(f'[SerialCardReader] Cannot open {self._port}: {exc} — running as stub')
            self._is_open = True
            return

        self._is_open = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True, name='serial-card-reader')
        self._thread.start()
        print(f'[SerialCardReader] Listening on {self._port} at {self._baud} baud')

    def close(self) -> None:
        self._is_open = False
        if self._serial:
            try:
                self._serial.close()
            except Exception:
                pass
            self._serial = None
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None

    def _read_loop(self) -> None:
        while self._is_open and self._serial:
            try:
                raw = self._serial.readline()
            except Exception as exc:
                if self._is_open:
                    print(f'[SerialCardReader] Read error: {exc}')
                break

            if not raw:
                continue  # readline timeout — loop again

            line = raw.decode('ascii', errors='replace').strip()
            if not line:
                continue

            if line.startswith(_DOOR_PREFIX):
                card_id = line[len(_DOOR_PREFIX):]
                print(f'[SerialCardReader] Door card scanned: {card_id}')
                self.door._emit('card', {'cardId': card_id, 'timestamp': int(time.time() * 1000)})
            elif line.startswith(_TOOL_PREFIX):
                card_id = line[len(_TOOL_PREFIX):]
                print(f'[SerialCardReader] Tool card scanned: {card_id}')
                self.tool._emit('card', {'cardId': card_id, 'timestamp': int(time.time() * 1000)})
            else:
                # Pass through any other ESP32 log output for debugging
                print(f'[SerialCardReader] {line}')
