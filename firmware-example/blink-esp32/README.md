# ESP32 blink — test firmware

Verifies flashing and the serial monitor end to end.

## Build the binaries

1. **File → Preferences → Additional boards manager URLs**, add:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
2. **Tools → Board → Boards Manager**, search `esp32`, install **esp32 by Espressif Systems**
3. **Tools → Board → ESP32 Arduino → ESP32 Dev Module** (or your exact board)
4. Open `Blink.ino`
5. **Sketch → Export Compiled Binary**

## The important difference from ESP8266

ESP8266 exports **one** merged file at `0x0`. ESP32 exports **three**, each at
its own offset:

| File | Offset (ESP32) | Offset (S3 / C3 / C6) |
|---|---|---|
| `Blink.ino.bootloader.bin` | `1000` | `0` |
| `Blink.ino.partitions.bin` | `8000` | `8000` |
| `Blink.ino.bin` (the app) | `10000` | `10000` |

Offsets in the flasher are entered in **hex without the `0x`** — so type
`1000`, `8000`, `10000`.

Getting these wrong is the usual reason a board flashes "successfully" and
then boot-loops or prints nothing.

## Flash it

**Quick test** — main page, Firmware file panel: add all three files, set the
offsets above, Target chip **ESP32**, Connect, Flash now.

**Publishing** — admin console, tick ESP32, add all three with those offsets,
flash mode `dio`, freq `40m`, size `4MB`.

## One file instead of three

If you have esptool installed, merge them so there is only one offset to get
wrong:

```bash
esptool.py --chip esp32 merge_bin -o merged.bin \
  --flash_mode dio --flash_freq 40m --flash_size 4MB \
  0x1000  Blink.ino.bootloader.bin \
  0x8000  Blink.ino.partitions.bin \
  0x10000 Blink.ino.bin
```

Then flash `merged.bin` alone at offset `0`.

## Expected result

The blue on-board LED blinks once per second. The serial monitor at
**115200 baud** prints the chip model, revision, core count, flash size and
MAC, then a running blink counter.

The LED on ESP32 DevKit boards is on **GPIO2** and is **active high** —
`digitalWrite(LED_PIN, HIGH)` turns it on. That is the opposite of the
ESP8266 NodeMCU.

## If it doesn't work

- **Flash stalls at "Connecting"** — hold **BOOT**, tap **EN/RST**, release
  **BOOT**, then start the flash again.
- **Nothing in the monitor** — press **Reset board** in the monitor toolbar.
  Connecting leaves the chip in download mode, which does not run your sketch.
- **Garbled output** — baud mismatch. The sketch uses 115200.
- **No LED activity** — your board may not have an on-board LED. Check the
  serial output instead, or wire an LED to GPIO2 via a 220R resistor.
