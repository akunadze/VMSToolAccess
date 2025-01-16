"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRFID = initRFID;
exports.readCard = readCard;
const mfrc522_rpi_1 = __importDefault(require("mfrc522-rpi"));
const rpi_softspi_1 = __importDefault(require("rpi-softspi"));
let mfrc522;
function initRFID() {
    const softSPI = new rpi_softspi_1.default({
        clock: 23, // pin number of SCLK
        mosi: 19, // pin number of MOSI
        miso: 21, // pin number of MISO
        client: 24 // pin number of CS
    });
    mfrc522 = new mfrc522_rpi_1.default(softSPI).setResetPin(22).setBuzzerPin(18);
}
function readCard() {
    mfrc522.reset();
    //# Scan for cards
    let response = mfrc522.findCard();
    if (!response.status) {
        return "";
    }
    //# Get the UID of the card
    response = mfrc522.getUid();
    if (!response.status) {
        return "";
    }
    const uid = response.data;
    return uid[0].toString(16) + uid[1].toString(16) + uid[2].toString(16) + uid[3].toString(16);
}
//# sourceMappingURL=mfrc522.js.map