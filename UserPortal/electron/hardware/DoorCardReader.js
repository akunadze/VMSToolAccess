const EventEmitter = require('events');

/**
 * Reads door cards from a USB HID card scanner.
 *
 * On Linux (Raspberry Pi), most HID card readers enumerate as USB keyboard
 * devices. They send the card number as a sequence of keystrokes terminated
 * by an Enter keypress. The open() method should open the HID device, buffer
 * incoming keystrokes, and emit a 'card' event once a full card number arrives.
 *
 * Events emitted:
 *   'card'  → { cardId: string, timestamp: number }
 *   'error' → Error
 */
class DoorCardReader extends EventEmitter {
  /**
   * @param {object} options
   * @param {number} [options.vendorId]   USB HID vendor ID
   * @param {number} [options.productId]  USB HID product ID
   */
  constructor(options = {}) {
    super();
    this.options = options;
    this._isOpen = false;
  }

  /**
   * Opens the HID device and begins listening for card scans.
   *
   * TODO: Implement using the 'node-hid' package:
   *   const HID = require('node-hid');
   *   const device = new HID.HID(this.options.vendorId, this.options.productId);
   *   let buffer = '';
   *   device.on('data', (data) => {
   *     const key = decodeHidKeystroke(data); // map HID usage code → char
   *     if (key === '\n') {
   *       if (buffer.length > 0) this.emit('card', { cardId: buffer, timestamp: Date.now() });
   *       buffer = '';
   *     } else if (key) {
   *       buffer += key;
   *     }
   *   });
   *   device.on('error', (err) => this.emit('error', err));
   */
  open() {
    console.log('[DoorCardReader] open() called — stub, no HID device connected');
    this._isOpen = true;
  }

  /**
   * Closes the HID device connection.
   *
   * TODO: call device.close() on the node-hid device instance.
   */
  close() {
    console.log('[DoorCardReader] close() called');
    this._isOpen = false;
  }

  get isOpen() {
    return this._isOpen;
  }

  /**
   * Simulates a door card scan without hardware. Used in development and testing.
   * @param {string} cardId
   */
  simulateScan(cardId) {
    this.emit('card', { cardId, timestamp: Date.now() });
  }
}

module.exports = { DoorCardReader };
