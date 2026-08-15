/**
 * Web Serial abstraction.
 * Owns the single SerialPort instance shared by the flasher and the monitor.
 */

export const DEFAULT_BAUD = 115200;

export const BAUD_RATES = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600];

const CHIP_USB_MAP = {
  // Espressif native USB (VID 0x303a)
  '303a:1001': 'ESP32-S3',
  '303a:1002': 'ESP32-S3',
  '303a:0002': 'ESP32-S2',
  '303a:0003': 'ESP32-S2',
  '303a:1011': 'ESP32-C3',
  '303a:1012': 'ESP32-C3',
  '303a:1101': 'ESP32-C6',
  '303a:1102': 'ESP32-C6',
  // Native USB tells us the chip. A plain USB↔UART bridge does not — a
  // NodeMCU (ESP8266) and an ESP32 DevKit both ship CH340 or CP2102, so the
  // descriptor is genuinely ambiguous. Those are listed below as null and the
  // user picks the target, or esptool identifies it at flash time.
  // Arduino
  '2341:0043': 'Arduino Uno',
  '2341:0001': 'Arduino Uno',
  '2341:0010': 'Arduino Mega',
  '2341:0042': 'Arduino Mega',
  '1a86:7522': 'Arduino Nano',
};

/** Bridges that cannot identify the chip behind them. */
export const AMBIGUOUS_BRIDGES = new Set([
  '10c4:ea60', // Silicon Labs CP2102
  '10c4:ea70', // CP2105
  '1a86:7523', // WCH CH340
  '1a86:55d4', // WCH CH9102
  '0403:6001', // FTDI FT232
  '0403:6015', // FTDI FT231X
]);

export const USB_VENDORS = {
  '303a': 'Espressif',
  '10c4': 'Silicon Labs',
  '1a86': 'WCH',
  '0403': 'FTDI',
  '2341': 'Arduino',
  '2a03': 'Arduino',
};

let port = null;
let monitorAbort = null;
let monitorRunning = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function getRawPort() {
  return port;
}

export function isConnected() {
  return port !== null;
}

export function getPortInfo() {
  if (!port?.getInfo) return null;
  const info = port.getInfo();
  const vid = (info.usbVendorId ?? 0).toString(16).padStart(4, '0');
  const pid = (info.usbProductId ?? 0).toString(16).padStart(4, '0');
  return {
    vid: `0x${vid}`,
    pid: `0x${pid}`,
    key: `${vid}:${pid}`,
    vendor: USB_VENDORS[vid] || 'Unknown vendor',
  };
}

/* ── Port lifecycle ─────────────────────────────────────────────────── */

export async function closePort() {
  await stopMonitor();
  if (!port) return;
  try {
    if (port.readable?.locked || port.writable?.locked) await sleep(60);
    await port.close();
  } catch {
    /* already closed */
  }
}

export async function openPort(baudRate = DEFAULT_BAUD) {
  if (!port) throw new Error('No serial port selected.');
  if (port.readable || port.writable) return port; // already open
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
    bufferSize: 65536,
  });
  return port;
}

/* ── Reset sequences ────────────────────────────────────────────────── */

async function resetIntoBootloader(log) {
  if (!port) return;
  log('Pulsing DTR/RTS to enter download mode…', 'dim');
  try {
    // RTS → EN (reset), DTR → GPIO0 (boot select). Classic esptool sequence.
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    await sleep(50);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(400);
    log('Auto-reset sent.', 'dim');
  } catch {
    log('Auto-reset unsupported on this adapter.', 'warning');
    log('Hold BOOT → tap RESET → release BOOT.', 'warning');
    await sleep(400);
  }
}

/**
 * Boots the application, as opposed to resetIntoBootloader().
 *
 * Connecting deliberately drops the chip into ROM download mode so esptool
 * can talk to it — but the ROM bootloader never runs your sketch, so a serial
 * monitor opened straight afterwards sits silent forever. Pulsing EN with
 * GPIO0 held high restarts the board into normal run mode.
 */
export async function resetIntoRunMode(log = () => {}) {
  if (!port) return;
  try {
    // DTR false keeps GPIO0 high (run, not download); RTS pulses EN.
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await sleep(120);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(250);
    log('Board reset into run mode.', 'dim');
  } catch {
    log('This adapter cannot auto-reset. Tap the RESET button on the board.', 'warning');
  }
}

async function resetArduino(log) {
  if (!port) return;
  log('Toggling DTR to reset the Arduino bootloader…', 'dim');
  try {
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(80);
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    await sleep(250);
    log('Bootloader reset complete.', 'success');
  } catch {
    log('Auto-reset unsupported. Press RESET when flashing begins.', 'warning');
    await sleep(400);
  }
}

/* ── Connect ────────────────────────────────────────────────────────── */

export async function connectToDevice(log = console.log, options = {}) {
  const mode = options.mode || 'esp';
  const baudRate = options.baudRate || DEFAULT_BAUD;

  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is unavailable. Use Chrome, Edge or Opera on desktop.');
  }

  if (port) {
    await closePort();
    port = null;
  }

  log('Requesting serial port access…', 'info');
  try {
    port = await navigator.serial.requestPort({ filters: [] });
  } catch (err) {
    if (err?.name === 'NotFoundError') throw new Error('No serial port was selected.');
    throw err;
  }

  const info = getPortInfo();
  if (info) log(`Adapter: ${info.vendor} · VID ${info.vid} · PID ${info.pid}`, 'dim');

  log(`Opening port @ ${baudRate} baud…`, 'info');
  try {
    await openPort(baudRate);
  } catch (err) {
    const busy =
      'Serial port is busy. Close the Arduino IDE, any serial monitor, and other browser tabs, then unplug and reconnect the board.';
    log(busy, 'error');
    await closePort();
    port = null;
    throw new Error(String(err?.message || '').includes('Failed to open') ? busy : err.message);
  }

  if (mode === 'arduino') {
    await resetArduino(log);
    return port;
  }

  await resetIntoBootloader(log);
  return port;
}

/* ── Chip detection ─────────────────────────────────────────────────── */

export async function detectChip(log = console.log, options = {}) {
  if (!port) throw new Error('Not connected.');

  if (options.mode === 'arduino') {
    const board = options.board || 'Arduino Uno';
    log(`Board profile: ${board}`, 'info');
    return board;
  }

  log('Identifying chip from USB descriptor…', 'info');
  const info = getPortInfo();
  const preferred = options.board && options.board !== 'auto' ? options.board : null;
  let chip = preferred || 'ESP32';

  if (info) {
    if (CHIP_USB_MAP[info.key]) {
      chip = CHIP_USB_MAP[info.key];
      log(`Detected ${chip} over native USB.`, 'success');
    } else if (info.key.startsWith('303a')) {
      chip = preferred || 'ESP32-S3';
      log('Espressif native USB — assuming ESP32-S3.', 'warning');
    } else if (AMBIGUOUS_BRIDGES.has(info.key)) {
      if (preferred) {
        log(`${info.vendor} bridge — using your selected target: ${preferred}.`, 'info');
      } else {
        log(`${info.vendor} bridge detected. This adapter is used by both ESP32 and`, 'warning');
        log('ESP8266 boards, so the chip cannot be read from USB alone.', 'warning');
        log('Assuming ESP32 — pick a target above if this is a NodeMCU/ESP8266.', 'warning');
      }
    } else {
      log('Unrecognised adapter. The exact chip is confirmed at flash time.', 'warning');
    }
  }

  // Release the port so esptool-js can take ownership of it.
  log('Releasing port for ESPLoader…', 'dim');
  await closePort();
  return chip;
}

/* ── Serial monitor ─────────────────────────────────────────────────── */

export async function startMonitor({
  baudRate = DEFAULT_BAUD, onData, onError, onOpen, onSilence, resetFirst = true,
} = {}) {
  if (!port) throw new Error('Connect a device first.');
  if (monitorRunning) return;

  await openPort(baudRate).catch(async (err) => {
    // Port may be open at the wrong baud — cycle it.
    await closePort();
    await openPort(baudRate).catch(() => {
      throw err;
    });
  });

  if (!port.readable) throw new Error('Serial port opened but is not readable.');

  monitorRunning = true;
  monitorAbort = { stop: false, reader: null };
  onOpen?.(baudRate);

  // Leaving download mode is what actually makes output appear.
  if (resetFirst) await resetIntoRunMode();

  const decoder = new TextDecoder();
  const reader = port.readable.getReader();
  monitorAbort.reader = reader;

  // If nothing arrives at all, the usual causes are a wrong baud rate or a
  // board still sitting in download mode. Say so rather than staying blank.
  let received = 0;
  const silenceTimer = setTimeout(() => {
    if (!received && monitorRunning) onSilence?.(baudRate);
  }, 4000);

  (async () => {
    let buffer = '';
    try {
      while (!monitorAbort.stop) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        received += value.length;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) onData?.(line);

        // Flush partial lines that stall (prompts without newline).
        if (buffer.length > 512) {
          onData?.(buffer);
          buffer = '';
        }
      }
      if (buffer) onData?.(buffer);
    } catch (err) {
      if (!monitorAbort.stop) onError?.(err);
    } finally {
      clearTimeout(silenceTimer);
      try { reader.releaseLock(); } catch {}
      monitorRunning = false;
    }
  })();
}

export async function stopMonitor() {
  if (!monitorAbort) return;
  monitorAbort.stop = true;
  try { await monitorAbort.reader?.cancel(); } catch {}
  try { monitorAbort.reader?.releaseLock(); } catch {}
  monitorAbort = null;
  monitorRunning = false;
  await sleep(30);
}

export function isMonitorRunning() {
  return monitorRunning;
}

export async function sendSerialLine(text, lineEnding = '\r\n') {
  if (!port?.writable) throw new Error('Serial port is not open for writing.');
  const writer = port.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(text + lineEnding));
  } finally {
    try { writer.releaseLock(); } catch {}
  }
}

/* ── Disconnect ─────────────────────────────────────────────────────── */

export async function disconnect(log = console.log) {
  try {
    await closePort();
  } finally {
    port = null;
    log('Disconnected.', 'info');
  }
}
