// Handle Squirrel installer events on Windows (must be first).
if (require('electron-squirrel-startup')) process.exit(0);

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const { startKioskServer } = require('./kioskServer');
const { DoorCardReader, ToolCardReader } = require('./hardware');

// Pi 3's VideoCore IV GPU is not well-supported by Chromium. Disabling GPU
// acceleration avoids driver overhead and gives more consistent performance
// with software rendering. Also suppress noisy Chromium startup checks.
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// In a packaged build, Flutter web is placed in resources/web/ by Forge's
// extraResource. In dev, it lives in the source tree.
const flutterWebDir = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, '../flutter_ui/build/web');

const KIOSK_PORT = 4000;

let mainWindow;
let server;

const doorCardReader = new DoorCardReader({
  // vendorId: 0x0000,  // Set USB HID vendor ID when hardware is available
  // productId: 0x0000, // Set USB HID product ID when hardware is available
});

const toolCardReader = new ToolCardReader({
  // spiDevice: '/dev/spidev0.0', // Set SPI device path on Raspberry Pi
  // resetPin: 25,                // Set GPIO reset pin number (BCM numbering)
});

app.whenReady().then(async () => {
  doorCardReader.open();
  toolCardReader.open();

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff', // prevent white flash during load
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Await the server being ready before loading — no arbitrary delay.
  server = await startKioskServer({ doorCardReader, toolCardReader, port: KIOSK_PORT, flutterWebDir });
  mainWindow.loadURL(`http://localhost:${KIOSK_PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('before-quit', () => {
  doorCardReader.close();
  toolCardReader.close();
  if (server) server.close();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
