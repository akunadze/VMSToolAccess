const EventEmitter = require('events');

/**
 * Reads tool cards from an MFRC522 RFID module via SPI on the Raspberry Pi.
 *
 * The MFRC522 communicates over SPI (typically /dev/spidev0.0). A polling loop
 * detects card presence, reads the UID, and emits a 'card' event. The reset
 * pin (RST) must be toggled during initialisation using a GPIO library.
 *
 * Events emitted:
 *   'card'  → { cardId: string, timestamp: number }  (cardId is uppercase hex UID)
 *   'error' → Error
 */
class ToolCardReader extends EventEmitter {
  /**
   * @param {object} options
   * @param {string} [options.spiDevice]  SPI device path, e.g. '/dev/spidev0.0'
   * @param {number} [options.resetPin]   GPIO pin number (BCM) for MFRC522 RST
   * @param {number} [options.pollMs]     Polling interval in milliseconds (default 200)
   */
  constructor(options = {}) {
    super();
    this.options = { pollMs: 200, ...options };
    this._isOpen = false;
    this._pollInterval = null;
    this._lastCardId = null; // debounce: avoid re-emitting while card stays on reader
  }

  /**
   * Initialises the MFRC522 and starts the polling loop.
   *
   * TODO: Implement using a suitable Node.js SPI + GPIO package, e.g.:
   *
   *   Option A — 'mfrc522-rpi' (high-level wrapper):
   *     const Mfrc522 = require('mfrc522-rpi');
   *     const mfrc522 = new Mfrc522().setResetPin(this.options.resetPin).setBusDevice(0, 0);
   *     this._pollInterval = setInterval(() => {
   *       mfrc522.reset();
   *       const { status } = mfrc522.findCard();
   *       if (status !== mfrc522.STATUS_OK) { this._lastCardId = null; return; }
   *       const { status: s2, data } = mfrc522.getUid();
   *       if (s2 !== mfrc522.STATUS_OK) return;
   *       const cardId = data.slice(0, 4).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
   *       if (cardId !== this._lastCardId) {
   *         this._lastCardId = cardId;
   *         this.emit('card', { cardId, timestamp: Date.now() });
   *       }
   *     }, this.options.pollMs);
   *
   *   Option B — raw 'spi-device' + 'onoff' GPIO:
   *     Manually implement the MFRC522 register protocol over SPI.
   */
  open() {
    console.log('[ToolCardReader] open() called — stub, no MFRC522 device connected');
    this._isOpen = true;
  }

  /**
   * Stops the polling loop and releases the SPI device.
   *
   * TODO: clearInterval(this._pollInterval) and close the SPI device/GPIO.
   */
  close() {
    console.log('[ToolCardReader] close() called');
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    this._isOpen = false;
  }

  get isOpen() {
    return this._isOpen;
  }

  /**
   * Simulates a tool card scan without hardware. Used in development and testing.
   * @param {string} cardId  8-character uppercase hex string, e.g. 'AABBCCDD'
   */
  simulateScan(cardId) {
    this.emit('card', { cardId, timestamp: Date.now() });
  }
}

module.exports = { ToolCardReader };
