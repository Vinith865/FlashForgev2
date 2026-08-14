/**
 * Flashing pipelines.
 *   • ESP32 family  → esptool-js over Web Serial
 *   • Arduino AVR   → STK500v1 over Web Serial (Intel HEX)
 *
 * Firmware can come from a hosted project manifest or from a file the user
 * dropped into the browser — both are reduced to the same `fileArray` shape.
 */

import { getRawPort, closePort, openPort, disconnect } from './serial';
import { fetchManifest } from './api';

const ESP_BAUD = 115200;
const ESP_LONG_TIMEOUT_MS = 120_000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const normaliseChip = (c) => String(c || '').toLowerCase().replace(/[-_\s]/g, '');

/* ── Binary helpers ─────────────────────────────────────────────────── */

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/* ── Manifest → downloadable parts ──────────────────────────────────── */

function selectBuild(manifest, chip) {
  const target = normaliseChip(chip);
  return (
    manifest.builds.find((b) => normaliseChip(b.chipFamily) === target) || manifest.builds[0]
  );
}

async function downloadPart(url, onLog) {
  const filename = url.split('/').pop().split('?')[0];
  onLog(`  ↓ ${filename}`, 'dim');

  let response;
  try {
    response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
  } catch (err) {
    onLog(`  ✕ Network error fetching ${filename}: ${err.message}`, 'error');
    throw new Error(`Could not download ${filename}`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading ${filename}`);

  const buffer = await response.arrayBuffer();
  onLog(`  ✓ ${filename} · ${formatBytes(buffer.byteLength)}`, 'success');
  return new Uint8Array(buffer);
}

export async function resolveProjectFirmware({ projectId, chip, onLog, onProgress }) {
  onLog('Fetching firmware manifest…', 'info');
  const manifest = await fetchManifest(projectId, chip);
  if (!manifest?.builds?.length) throw new Error('Manifest contains no builds.');

  onLog(`Manifest: ${manifest.name} v${manifest.version}`, 'success');
  const build = selectBuild(manifest, chip);
  onLog(`Target: ${build.chipFamily} · ${build.parts.length} part(s)`, 'info');

  build.parts.forEach((p, i) =>
    onLog(`  [${i + 1}] 0x${Number(p.offset).toString(16).padStart(5, '0')} → ${p.path.split('/').pop()}`, 'dim')
  );

  onProgress?.(4, 'Downloading firmware…');
  const fileArray = [];
  for (let i = 0; i < build.parts.length; i++) {
    const bytes = await downloadPart(build.parts[i].path, onLog);
    fileArray.push({ data: bytes, address: Number(build.parts[i].offset) || 0, name: build.parts[i].path.split('/').pop() });
    onProgress?.(4 + Math.round(((i + 1) / build.parts.length) * 16), `Downloaded ${i + 1}/${build.parts.length}`);
  }

  onLog(`All parts ready (${fileArray.length}).`, 'success');
  return { fileArray, manifest, build };
}

/** Turn dropped File objects into the same fileArray shape. */
export async function resolveLocalFirmware({ entries, onLog, onProgress }) {
  const fileArray = [];
  for (let i = 0; i < entries.length; i++) {
    const { file, offset } = entries[i];
    const bytes = new Uint8Array(await file.arrayBuffer());
    onLog(`  ✓ ${file.name} · ${formatBytes(bytes.length)} @ 0x${Number(offset).toString(16)}`, 'success');
    fileArray.push({ data: bytes, address: Number(offset) || 0, name: file.name });
    onProgress?.(4 + Math.round(((i + 1) / entries.length) * 16), `Loaded ${i + 1}/${entries.length}`);
  }
  return { fileArray };
}

/* ── ESPLoader plumbing ─────────────────────────────────────────────── */

function makeTerminal(onLog) {
  // esptool-js emits a LOT of "Writing at 0x…" chatter; keep it dim and deduped.
  let last = '';
  const emit = (msg) => {
    const text = String(msg).trim();
    if (!text || text === last) return;
    last = text;
    onLog(text, /error|fail/i.test(text) ? 'error' : 'dim');
  };
  return { clean() {}, write: emit, writeLine: emit };
}

function extendTimeouts(loader) {
  loader.ERASE_REGION_TIMEOUT_PER_MB = 180_000;
  loader.ERASE_WRITE_TIMEOUT_PER_MB = 180_000;
  loader.FLASH_WRITE_SIZE = 0x2000;

  const original = loader.checkCommand?.bind(loader);
  if (!original) return;
  loader.checkCommand = (
    description = '',
    op = null,
    data = new Uint8Array(0),
    chk = 0,
    responseDataLength = 0,
    timeout = 3000
  ) => {
    const slow = /compressed flash mode|write compressed data|Flash download mode|erase/i.test(
      String(description)
    );
    return original(
      description,
      op,
      data,
      chk,
      responseDataLength,
      slow ? Math.max(timeout || 0, ESP_LONG_TIMEOUT_MS) : timeout
    );
  };
}

async function createLoader(onLog, baudrate = ESP_BAUD) {
  const { ESPLoader, Transport } = await import('esptool-js');
  const port = getRawPort();
  if (!port) throw new Error('No serial port. Connect your board first.');

  await closePort(); // esptool-js opens the port itself
  const transport = new Transport(port, false);

  const loader = new ESPLoader({
    transport,
    baudrate,
    terminal: makeTerminal(onLog),
    enableTracing: false,
    debugLogging: false,
  });
  return { loader, transport };
}

async function syncWithRetries(loader, onLog, onProgress, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      onLog(`Sync attempt ${attempt}/${attempts}…`, 'dim');
      onProgress?.(22 + attempt, 'Syncing with bootloader…');
      const chip = await loader.main();
      return chip;
    } catch (err) {
      onLog(`Attempt ${attempt} failed: ${err.message}`, 'warning');
      if (attempt === 1) {
        onLog('→ Hold BOOT, tap RESET, then release BOOT.', 'warning');
      }
      if (attempt === attempts) throw err;
      await delay(1500);
    }
  }
  return null;
}

/* ── Device info ────────────────────────────────────────────────────── */

export async function readDeviceInfo({ onLog }) {
  let loader = null;
  let transport = null;

  try {
    onLog('Interrogating device…', 'info');
    ({ loader, transport } = await createLoader(onLog));
    const description = await syncWithRetries(loader, onLog, null, 2);

    const info = { chip: description || 'Unknown' };

    try { info.mac = await loader.chip.readMac(loader); } catch {}
    try {
      const freq = await loader.chip.getCrystalFreq?.(loader);
      if (freq) info.crystal = `${freq} MHz`;
    } catch {}
    try {
      const flashId = await loader.readFlashId();
      const sizeId = (flashId >> 16) & 0xff;
      info.flashSize = loader.DETECTED_FLASH_SIZES?.[sizeId] || 'unknown';
      info.flashManufacturer = `0x${(flashId & 0xff).toString(16).padStart(2, '0')}`;
    } catch {}
    try {
      const features = await loader.chip.getChipFeatures?.(loader);
      if (features) info.features = Array.isArray(features) ? features : [String(features)];
    } catch {}
    try {
      const desc = await loader.chip.getChipDescription?.(loader);
      if (desc) info.chip = desc;
    } catch {}

    onLog(`Chip     : ${info.chip}`, 'success');
    if (info.mac) onLog(`MAC      : ${info.mac}`, 'success');
    if (info.crystal) onLog(`Crystal  : ${info.crystal}`, 'success');
    if (info.flashSize) onLog(`Flash    : ${info.flashSize}`, 'success');
    if (info.features?.length) onLog(`Features : ${info.features.join(', ')}`, 'dim');

    return info;
  } finally {
    try { await transport?.disconnect(); } catch {}
    try { await loader?.transport?.disconnect(); } catch {}
  }
}

/* ── ESP32 flashing ─────────────────────────────────────────────────── */

export async function flashEsp32({
  fileArray,
  eraseAll = false,
  onLog,
  onProgress,
  onDone = () => {},
  onError = (e) => { throw e; },
}) {
  let loader = null;
  let transport = null;

  try {
    if (!fileArray?.length) throw new Error('No firmware parts to write.');

    onLog('\nInitialising ESPLoader…', 'info');
    onProgress(21, 'Connecting to chip…');
    ({ loader, transport } = await createLoader(onLog));

    const chip = await syncWithRetries(loader, onLog, onProgress, 3).catch(() => {
      throw new Error(
        'Could not reach the ESP32 bootloader after 3 attempts.\n' +
          '1. Unplug USB\n2. Hold BOOT\n3. Plug USB back in\n4. Release BOOT after 2s\n5. Try again'
      );
    });

    onLog(`✓ Bootloader online — ${chip}`, 'success');
    extendTimeouts(loader);
    onProgress(30, `Connected to ${chip}`);

    if (eraseAll) {
      onLog('\nErasing entire flash (this can take a minute)…', 'warning');
      onProgress(34, 'Erasing flash…');
      await loader.eraseFlash();
      onLog('Flash erased.', 'success');
    } else {
      onLog('\nSector-level erase during write (safer over flaky USB).', 'dim');
    }

    onLog('\nWriting firmware…', 'info');
    const totalBytes = fileArray.reduce((sum, f) => sum + f.data.byteLength, 0);

    await loader.writeFlash({
      fileArray,
      flashSize: 'keep',
      flashMode: 'keep',
      flashFreq: 'keep',
      eraseAll: false,
      compress: true,
      reportProgress(fileIndex, written, total) {
        const before = fileArray.slice(0, fileIndex).reduce((s, f) => s + f.data.byteLength, 0);
        const ratio = totalBytes ? (before + written) / totalBytes : 0;
        onProgress(
          Math.min(96, 40 + Math.round(ratio * 56)),
          `Part ${fileIndex + 1}/${fileArray.length} · ${formatBytes(written)} / ${formatBytes(total)}`
        );
      },
      // MD5 verification is skipped on purpose — it doubles flash time on
      // ROM (non-stub) connections and offers little on a fresh write.
    });

    onLog('Firmware written.', 'success');
    onProgress(97, 'Resetting…');

    try {
      await loader.after('hard_reset');
    } catch {
      onLog('Auto-reset failed — press RESET on the board to boot the new firmware.', 'warning');
    }

    onProgress(100, 'Complete');
    onLog('\n✅ Flash complete. Your board is running the new firmware.', 'success');
    onDone({ bytes: totalBytes, chip });
  } catch (err) {
    onLog(`\n✕ Flash failed: ${err.message}`, 'error');
    onError(err);
  } finally {
    try { await transport?.disconnect(); } catch {}
    try { await loader?.transport?.disconnect(); } catch {}
  }
}

/* ── Arduino (STK500v1) ─────────────────────────────────────────────── */

const ARDUINO_PROFILES = {
  'arduino mega': { baudRate: 115200, pageSize: 256, label: 'Arduino Mega' },
  'arduino nano': { baudRate: 57600, pageSize: 128, label: 'Arduino Nano' },
  'arduino uno': { baudRate: 115200, pageSize: 128, label: 'Arduino Uno' },
};

const arduinoProfile = (board = '') =>
  ARDUINO_PROFILES[String(board).toLowerCase()] ||
  (String(board).toLowerCase().includes('mega')
    ? ARDUINO_PROFILES['arduino mega']
    : String(board).toLowerCase().includes('nano')
    ? ARDUINO_PROFILES['arduino nano']
    : ARDUINO_PROFILES['arduino uno']);

export function parseIntelHex(hexText) {
  const memory = new Map();
  let upper = 0;

  for (const rawLine of String(hexText).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.startsWith(':')) throw new Error('Not a valid Intel HEX file.');

    const length = parseInt(line.slice(1, 3), 16);
    const address = parseInt(line.slice(3, 7), 16);
    const type = parseInt(line.slice(7, 9), 16);
    const data = line.slice(9, 9 + length * 2);

    if (type === 0x00) {
      for (let i = 0; i < length; i++) {
        memory.set(upper + address + i, parseInt(data.slice(i * 2, i * 2 + 2), 16));
      }
    } else if (type === 0x01) break;
    else if (type === 0x04) upper = parseInt(data, 16) << 16;
  }

  if (!memory.size) throw new Error('HEX file contains no program data.');
  const max = Math.max(...memory.keys());
  const bytes = new Uint8Array(max + 1).fill(0xff);
  for (const [addr, value] of memory) bytes[addr] = value;
  return bytes;
}

async function readWithTimeout(reader, ms = 1800) {
  return Promise.race([
    reader.read(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Bootloader timeout')), ms)),
  ]);
}

async function stk(reader, writer, bytes, expected = [0x14, 0x10]) {
  await writer.write(new Uint8Array(bytes));
  const received = [];
  while (received.length < expected.length) {
    const { value, done } = await readWithTimeout(reader);
    if (done) throw new Error('Serial port closed mid-transfer.');
    received.push(...value);
  }
  for (let i = 0; i < expected.length; i++) {
    if (received[i] !== expected[i]) {
      throw new Error(`Bootloader rejected command (0x${received[i].toString(16)})`);
    }
  }
}

export async function flashArduino({
  firmwareBytes,
  board,
  onLog,
  onProgress,
  onDone = () => {},
  onError = (e) => { throw e; },
}) {
  const port = getRawPort();
  if (!port) {
    onError(new Error('No serial port. Connect your Arduino first.'));
    return;
  }

  const profile = arduinoProfile(board);
  let reader;
  let writer;

  try {
    onLog(`Target: ${profile.label} · ${profile.pageSize}-byte pages @ ${profile.baudRate} baud`, 'info');
    await openPort(profile.baudRate).catch(() => {});
    onProgress(12, 'Resetting bootloader…');

    try {
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await delay(100);
      await port.setSignals({ dataTerminalReady: true, requestToSend: false });
      await delay(350);
    } catch {
      onLog('Auto-reset failed — press RESET now.', 'warning');
      await delay(900);
    }

    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    onLog('Syncing with STK500 bootloader…', 'info');
    let synced = false;
    for (let attempt = 1; attempt <= 12 && !synced; attempt++) {
      try {
        await stk(reader, writer, [0x30, 0x20]);
        synced = true;
      } catch {
        onLog(`  sync ${attempt}/12…`, 'dim');
        await delay(120);
      }
    }
    if (!synced) throw new Error('Arduino bootloader did not respond. Press RESET and retry.');

    onLog('Bootloader synced.', 'success');
    await stk(reader, writer, [0x50, 0x20]);
    onProgress(20, 'Programming…');

    const pageSize = profile.pageSize;
    const totalPages = Math.ceil(firmwareBytes.length / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const pageData = new Uint8Array(pageSize).fill(0xff);
      pageData.set(firmwareBytes.slice(start, start + pageSize));
      const wordAddress = start >> 1;

      await stk(reader, writer, [0x55, wordAddress & 0xff, (wordAddress >> 8) & 0xff, 0x20]);
      await stk(reader, writer, [0x64, (pageSize >> 8) & 0xff, pageSize & 0xff, 0x46, ...pageData, 0x20]);

      onProgress(20 + Math.round(((page + 1) / totalPages) * 76), `Page ${page + 1}/${totalPages}`);
    }

    await stk(reader, writer, [0x51, 0x20]);
    onProgress(100, 'Complete');
    onLog('\n✅ Arduino flash complete.', 'success');
    onDone({ bytes: firmwareBytes.length, chip: profile.label });
  } catch (err) {
    onLog(`\n✕ Arduino flash failed: ${err.message}`, 'error');
    onError(err);
  } finally {
    try { reader?.releaseLock(); } catch {}
    try { writer?.releaseLock(); } catch {}
  }
}

export async function abortFlash(onLog) {
  onLog('\n⚠ Aborted by user.', 'warning');
  await disconnect(onLog);
}
