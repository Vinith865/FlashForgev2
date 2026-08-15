'use client';

/**
 * Central state machine for connect → detect → flash → monitor.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectToDevice,
  detectChip,
  disconnect,
  getPortInfo,
  isWebSerialSupported,
  startMonitor,
  stopMonitor,
  resetIntoRunMode,
  sendSerialLine,
  closePort,
  openPort,
} from '@/services/serial';
import {
  abortFlash,
  flashArduino,
  flashEsp32,
  parseIntelHex,
  readDeviceInfo,
  resolveLocalFirmware,
  resolveProjectFirmware,
} from '@/services/flash';
import { useFlashHistory } from './useFlashHistory';

export const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  FLASHING: 'flashing',
  MONITORING: 'monitoring',
  DONE: 'done',
  ERROR: 'error',
};

const MAX_LOGS = 800;
const MAX_MONITOR_LINES = 1500;

export function useFlasher() {
  const [mode, setMode] = useState('esp'); // 'esp' | 'arduino'
  const [board, setBoard] = useState('ESP32');
  // 'auto' means "trust USB detection"; anything else is the user telling us
  // what is on the other end of an ambiguous CH340/CP2102 bridge.
  const [espTarget, setEspTarget] = useState('auto');
  const [status, setStatus] = useState(STATUS.IDLE);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [detectedChip, setDetectedChip] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [portInfo, setPortInfo] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [customFiles, setCustomFiles] = useState([]); // [{file, offset, id}]
  const [eraseAll, setEraseAll] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const [monitorLines, setMonitorLines] = useState([]);
  const [monitorBaud, setMonitorBaud] = useState(115200);
  const [monitorOn, setMonitorOn] = useState(false);

  const logId = useRef(0);
  const monitorId = useRef(0);
  const abortRef = useRef(false);
  const startedAt = useRef(0);

  const { history, record, clear: clearHistory, stats } = useFlashHistory();

  useEffect(() => {
    setIsSupported(isWebSerialSupported());
  }, []);

  /* ── Logging ──────────────────────────────────────────────────────── */

  const addLog = useCallback((message, level = 'info') => {
    const id = ++logId.current;
    setLogs((prev) => {
      const next = [...prev, { id, message: String(message), level, at: Date.now() }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logId.current = 0;
  }, []);

  const updateProgress = useCallback((percent, label) => {
    setProgress(Math.min(100, Math.max(0, percent)));
    if (label !== undefined) setProgressLabel(label);
  }, []);

  const banner = useCallback(
    (title) => {
      addLog('────────────────────────────────────────', 'dim');
      addLog(title, 'bold');
      addLog('────────────────────────────────────────', 'dim');
    },
    [addLog]
  );

  /* ── Selection ────────────────────────────────────────────────────── */

  const selectProject = useCallback(
    (project) => {
      setSelectedProject(project);
      if (!project) return;
      setCustomFiles([]);
      if (status === STATUS.DONE || status === STATUS.ERROR) {
        setStatus(detectedChip ? STATUS.READY : STATUS.IDLE);
        updateProgress(0, '');
      }
      addLog(`Selected “${project.name}” v${project.version}`, 'bold');
    },
    [status, detectedChip, addLog, updateProgress]
  );

  const addCustomFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []).filter((f) =>
        /\.(bin|hex)$/i.test(f.name)
      );
      if (!incoming.length) {
        addLog('Only .bin and .hex files can be flashed.', 'error');
        return;
      }
      setSelectedProject(null);
      setCustomFiles((prev) => {
        const next = [...prev];
        for (const file of incoming) {
          const isHex = /\.hex$/i.test(file.name);
          const guessed = /bootloader/i.test(file.name)
            ? 0x1000
            : /partition/i.test(file.name)
            ? 0x8000
            : /boot_?app/i.test(file.name)
            ? 0xe000
            : next.length === 0
            ? 0x10000
            : 0x10000;
          next.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            offset: isHex ? 0 : guessed,
          });
        }
        return next;
      });
      incoming.forEach((f) => addLog(`Staged ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, 'success'));
    },
    [addLog]
  );

  const updateCustomOffset = useCallback((id, offset) => {
    setCustomFiles((prev) => prev.map((f) => (f.id === id ? { ...f, offset } : f)));
  }, []);

  const removeCustomFile = useCallback((id) => {
    setCustomFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /* ── Connect ──────────────────────────────────────────────────────── */

  const connect = useCallback(async () => {
    if (!isWebSerialSupported()) {
      addLog('Web Serial is not available in this browser.', 'error');
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.CONNECTING);
    setDeviceInfo(null);
    banner(`${mode === 'arduino' ? 'Arduino' : 'ESP32'} · establishing link`);
    updateProgress(0, 'Connecting…');

    try {
      await connectToDevice(addLog, { mode, baudRate: 115200 });
      setPortInfo(getPortInfo());

      updateProgress(10, 'Identifying…');
      const chip = await detectChip(addLog, {
        mode,
        board: mode === 'esp' ? espTarget : board,
      });
      setDetectedChip(chip);
      if (mode === 'esp') setBoard(chip);

      setStatus(STATUS.READY);
      updateProgress(0, '');
      addLog(`Ready. Target: ${chip}`, 'success');
    } catch (err) {
      addLog(`Connection failed: ${err.message}`, 'error');
      setStatus(STATUS.ERROR);
      updateProgress(0, '');
      await disconnect(addLog).catch(() => {});
    }
  }, [mode, board, espTarget, addLog, banner, updateProgress]);

  const reset = useCallback(async () => {
    setMonitorOn(false);
    await stopMonitor().catch(() => {});
    await disconnect(addLog).catch(() => {});
    setStatus(STATUS.IDLE);
    setDetectedChip(null);
    setDeviceInfo(null);
    setPortInfo(null);
    updateProgress(0, '');
  }, [addLog, updateProgress]);

  /* ── Device info ──────────────────────────────────────────────────── */

  const inspect = useCallback(async () => {
    if (mode !== 'esp') {
      addLog('Device inspection is only available for ESP32 targets.', 'warning');
      return;
    }
    try {
      banner('Reading device information');
      const info = await readDeviceInfo({ onLog: addLog });
      setDeviceInfo(info);
      if (info.chip) setDetectedChip(info.chip.split(' ')[0] || detectedChip);
    } catch (err) {
      addLog(`Could not read device info: ${err.message}`, 'error');
    }
  }, [mode, addLog, banner, detectedChip]);

  /* ── Flash ────────────────────────────────────────────────────────── */

  const flash = useCallback(async () => {
    const hasCustom = customFiles.length > 0;
    if (!selectedProject && !hasCustom) {
      addLog('Pick a project or drop a firmware file first.', 'error');
      return;
    }
    if (status === STATUS.FLASHING) return;
    if (status !== STATUS.READY && status !== STATUS.DONE && status !== STATUS.ERROR) {
      addLog('Connect a board before flashing.', 'error');
      return;
    }

    setMonitorOn(false);
    await stopMonitor().catch(() => {});

    abortRef.current = false;
    startedAt.current = Date.now();
    setStatus(STATUS.FLASHING);
    updateProgress(0, 'Preparing…');
    banner(`Flashing · ${selectedProject ? selectedProject.name : `${customFiles.length} local file(s)`}`);

    const label = selectedProject?.name || customFiles.map((f) => f.file.name).join(', ');

    const onProgress = (pct, text) => {
      if (!abortRef.current) updateProgress(pct, text);
    };

    const onDone = (result = {}) => {
      setStatus(STATUS.DONE);
      updateProgress(100, 'Complete');
      setLastResult({ ...result, durationMs: Date.now() - startedAt.current });
      record({
        status: 'success',
        project: label,
        chip: result.chip || detectedChip,
        bytes: result.bytes || 0,
        durationMs: Date.now() - startedAt.current,
      });
    };

    const onError = (err) => {
      if (abortRef.current) return;
      setStatus(STATUS.ERROR);
      updateProgress(0, '');
      setLastResult(null);
      record({
        status: 'error',
        project: label,
        chip: detectedChip,
        error: err?.message?.slice(0, 200),
        durationMs: Date.now() - startedAt.current,
      });
    };

    try {
      if (mode === 'arduino') {
        let bytes;
        if (hasCustom) {
          const entry = customFiles.find((f) => /\.hex$/i.test(f.file.name)) || customFiles[0];
          bytes = parseIntelHex(await entry.file.text());
        } else {
          const { fileArray } = await resolveProjectFirmware({
            projectId: selectedProject.id,
            chip: board,
            onLog: addLog,
            onProgress,
          });
          // Arduino manifests carry a single .hex part, delivered as raw bytes.
          const raw = fileArray[0]?.data;
          if (!raw) throw new Error('Arduino projects need a .hex firmware file.');
          bytes = parseIntelHex(new TextDecoder().decode(raw));
        }
        await flashArduino({ firmwareBytes: bytes, board, onLog: addLog, onProgress, onDone, onError });
      } else {
        const { fileArray } = hasCustom
          ? await resolveLocalFirmware({
              entries: customFiles.map((f) => ({ file: f.file, offset: f.offset })),
              onLog: addLog,
              onProgress,
            })
          : await resolveProjectFirmware({
              projectId: selectedProject.id,
              chip: detectedChip || 'ESP32',
              // A guess from an ambiguous bridge must not hard-fail the
              // manifest lookup — esptool confirms the real chip anyway.
              assertChip: espTarget !== 'auto',
              onLog: addLog,
              onProgress,
            });

        await flashEsp32({ fileArray, eraseAll, onLog: addLog, onProgress, onDone, onError });
      }
    } catch (err) {
      addLog(`✕ ${err.message}`, 'error');
      onError(err);
    }
  }, [
    customFiles,
    selectedProject,
    status,
    mode,
    board,
    detectedChip,
    eraseAll,
    espTarget,
    addLog,
    banner,
    updateProgress,
    record,
  ]);

  const abort = useCallback(async () => {
    abortRef.current = true;
    setStatus(STATUS.ERROR);
    await abortFlash(addLog);
    updateProgress(0, '');
  }, [addLog, updateProgress]);

  /* ── Serial monitor ───────────────────────────────────────────────── */

  const pushMonitor = useCallback((line) => {
    const id = ++monitorId.current;
    setMonitorLines((prev) => {
      const next = [...prev, { id, text: line, at: Date.now() }];
      return next.length > MAX_MONITOR_LINES ? next.slice(-MAX_MONITOR_LINES) : next;
    });
  }, []);

  const toggleMonitor = useCallback(async () => {
    if (monitorOn) {
      setMonitorOn(false);
      await stopMonitor();
      addLog('Serial monitor stopped.', 'dim');
      setStatus((s) => (s === STATUS.MONITORING ? STATUS.READY : s));
      return;
    }

    try {
      await closePort();
      await openPort(monitorBaud);
      await startMonitor({
        baudRate: monitorBaud,
        onData: pushMonitor,
        onError: (err) => {
          addLog(`Monitor error: ${err.message}`, 'error');
          setMonitorOn(false);
        },
        onSilence: (baud) => {
          pushMonitor(`— nothing received at ${baud} baud after 4s —`);
          pushMonitor('  • Check the baud rate matches Serial.begin() in your sketch');
          pushMonitor('  • Tap RESET on the board, or press "Reset board" above');
        },
      });
      setMonitorOn(true);
      setStatus(STATUS.MONITORING);
      addLog(`Serial monitor running @ ${monitorBaud} baud.`, 'success');
    } catch (err) {
      addLog(`Could not start monitor: ${err.message}`, 'error');
    }
  }, [monitorOn, monitorBaud, pushMonitor, addLog]);

  const sendMonitorLine = useCallback(
    async (text, lineEnding) => {
      try {
        await sendSerialLine(text, lineEnding);
        pushMonitor(`» ${text}`);
      } catch (err) {
        addLog(`Send failed: ${err.message}`, 'error');
      }
    },
    [pushMonitor, addLog]
  );

  const resetBoard = useCallback(async () => {
    try {
      await resetIntoRunMode((m, level) => addLog(m, level));
      pushMonitor('— board reset —');
    } catch (err) {
      addLog(`Reset failed: ${err.message}`, 'error');
    }
  }, [addLog, pushMonitor]);

  const clearMonitor = useCallback(() => {
    setMonitorLines([]);
    monitorId.current = 0;
  }, []);

  /* ── Cleanup ──────────────────────────────────────────────────────── */

  useEffect(() => () => { stopMonitor().catch(() => {}); }, []);

  return {
    // state
    mode, setMode,
    board, setBoard,
    espTarget, setEspTarget,
    status, logs, progress, progressLabel,
    detectedChip, deviceInfo, portInfo,
    selectedProject, customFiles, eraseAll, setEraseAll, lastResult,
    isSupported,
    monitorLines, monitorBaud, setMonitorBaud, monitorOn,
    history, stats,
    isBusy: status === STATUS.FLASHING || status === STATUS.CONNECTING,
    step:
      status === STATUS.IDLE || status === STATUS.CONNECTING
        ? 1
        : !selectedProject && customFiles.length === 0
        ? 2
        : 3,
    isConnected: status === STATUS.READY || status === STATUS.DONE || status === STATUS.MONITORING || status === STATUS.FLASHING,
    // actions
    connect, reset, inspect, flash, abort,
    selectProject, addCustomFiles, updateCustomOffset, removeCustomFile,
    addLog, clearLogs,
    toggleMonitor, sendMonitorLine, clearMonitor, resetBoard,
    clearHistory,
  };
}
