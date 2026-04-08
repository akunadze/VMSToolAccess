# Hardware Implementation Guide

Both reader classes share the same `EventEmitter` interface. Only the `open()` and `close()` methods need to be filled in with real I/O code — everything else (event routing, simulation, WebSocket broadcast) is already wired up.

---

## DoorCardReader — USB HID Card Scanner

**How it works on Linux/Raspberry Pi:**  
Most USB badge/card readers enumerate as USB HID keyboard devices. When a card is swiped, the reader sends the card number as a sequence of keystrokes followed by Enter (`\n`). The reader does not show up as `/dev/input/eventX` in keyboard mode; use `node-hid` to read raw HID reports.

**Recommended package:** [`node-hid`](https://github.com/node-hid/node-hid)

```bash
npm install node-hid
```

**Finding vendor/product IDs:**
```bash
# List all HID devices
node -e "const HID = require('node-hid'); console.log(HID.devices())"
# Or use lsusb on the Pi
lsusb
```

**Implementation sketch for `open()`:**
```js
const HID = require('node-hid');

// HID usage → ASCII character map (simplified; extend as needed)
const HID_KEY_MAP = {
  0x04: 'a', 0x05: 'b', /* ... */ 0x27: '0',
  0x1e: '1', 0x1f: '2', 0x20: '3', 0x21: '4',
  0x22: '5', 0x23: '6', 0x24: '7', 0x25: '8', 0x26: '9',
  0x28: '\n', // Enter
};

open() {
  const device = new HID.HID(this.options.vendorId, this.options.productId);
  let buffer = '';

  device.on('data', (data) => {
    // data[2] is the key usage code in a standard boot keyboard report
    const key = HID_KEY_MAP[data[2]];
    if (!key) return;
    if (key === '\n') {
      if (buffer.length > 0) {
        this.emit('card', { cardId: buffer, timestamp: Date.now() });
        buffer = '';
      }
    } else {
      buffer += key;
    }
  });

  device.on('error', (err) => this.emit('error', err));
  this._device = device;
  this._isOpen = true;
}

close() {
  this._device?.close();
  this._isOpen = false;
}
```

---

## ToolCardReader — MFRC522 RFID Module (SPI)

**How it works:**  
The MFRC522 communicates over SPI. A polling loop checks for card presence at a configurable interval (default 200 ms). When a card is detected, its 4-byte UID is read and emitted as an 8-character uppercase hex string.

**Wiring (Raspberry Pi GPIO):**

| MFRC522 Pin | RPi Pin | BCM GPIO |
|-------------|---------|----------|
| SDA (SS)    | 24      | GPIO 8 (CE0) |
| SCK         | 23      | GPIO 11 |
| MOSI        | 19      | GPIO 10 |
| MISO        | 21      | GPIO 9  |
| GND         | 6       | GND     |
| RST         | 22      | GPIO 25 |
| 3.3V        | 1       | 3.3V    |

**Enable SPI on the Pi:**
```bash
sudo raspi-config  # → Interface Options → SPI → Enable
```

**Recommended package:** [`mfrc522-rpi`](https://www.npmjs.com/package/mfrc522-rpi)

```bash
npm install mfrc522-rpi
```

**Implementation sketch for `open()`:**
```js
const Mfrc522 = require('mfrc522-rpi');

open() {
  const mfrc522 = new Mfrc522(this.options.spiDevice ?? '/dev/spidev0.0')
    .setResetPin(this.options.resetPin ?? 25);

  this._pollInterval = setInterval(() => {
    try {
      mfrc522.reset();
      const { status } = mfrc522.findCard();
      if (status !== mfrc522.STATUS_OK) {
        this._lastCardId = null; // card removed
        return;
      }
      const { status: s2, data } = mfrc522.getUid();
      if (s2 !== mfrc522.STATUS_OK) return;

      const cardId = data.slice(0, 4)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

      if (cardId !== this._lastCardId) {
        this._lastCardId = cardId;
        this.emit('card', { cardId, timestamp: Date.now() });
      }
    } catch (err) {
      this.emit('error', err);
    }
  }, this.options.pollMs);

  this._isOpen = true;
}

close() {
  clearInterval(this._pollInterval);
  this._pollInterval = null;
  this._isOpen = false;
}
```

---

## Testing without hardware

Use the dev simulate endpoints while the Electron app is running:

```bash
# Simulate a door card scan
curl -X POST http://localhost:4000/kiosk-api/dev/simulate-door-scan \
     -H "Content-Type: application/json" \
     -d '{"cardId": "AB:CD:EF:12"}'

# Simulate a tool card scan
curl -X POST http://localhost:4000/kiosk-api/dev/simulate-tool-scan \
     -H "Content-Type: application/json" \
     -d '{"cardId": "AABBCCDD"}'
```

These endpoints are only available when `NODE_ENV` is not `production`.
