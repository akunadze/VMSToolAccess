import Mfrc522 from 'mfrc522-rpi';
import SoftSPI from 'rpi-softspi';

let mfrc522:any;

export function initRFID() {
    const softSPI = new SoftSPI({
        clock: 23, // pin number of SCLK
        mosi: 19, // pin number of MOSI
        miso: 21, // pin number of MISO
        client: 24 // pin number of CS
      });

    mfrc522 = new Mfrc522(softSPI).setResetPin(22).setBuzzerPin(18);
}

export function readCard():string {
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
