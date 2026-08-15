# ESP8266 / NodeMCU blink — TE Flasher test firmware

A minimal sketch to verify flashing and the serial monitor end to end.

## Build the .bin in the Arduino IDE

1. **File → Preferences → Additional boards manager URLs**, add:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
2. **Tools → Board → Boards Manager**, search `esp8266`, install **esp8266 by ESP8266 Community**
3. **Tools → Board → ESP8266 Boards → NodeMCU 1.0 (ESP-12E Module)**
4. Open `Blink.ino`
5. **Sketch → Export Compiled Binary**

That writes `Blink.ino.nodemcu.bin` (or similar) next to the sketch. It is a
**complete image** — bootloader, partition data and application in one file.

> Do not use the `.ino.elf` file, and ignore any `*.bin` with `bootloader` in
> the name if you see one. ESP8266 exports a single merged binary.

## Flash it

| Setting | Value |
|---|---|
| Target chip | **ESP8266 / NodeMCU** |
| Offset | **`0x0`** |
| Flash mode | `dio` |
| Flash freq | `40m` |
| Flash size | `4MB` |

The single offset of `0x0` is the important part — ESP8266 is not like ESP32,
where the bootloader sits at `0x1000` and the app at `0x10000`.

## Expected result

The blue on-board LED blinks once per second, and the serial monitor at
**115200 baud** prints the chip ID, flash size and a running blink counter.

The LED is on **GPIO2** and is **active low**: `digitalWrite(LED_PIN, LOW)`
turns it **on**.

## If it doesn't start

Some NodeMCU clones have a weak auto-reset circuit. After flashing, press the
**RST** button once. If flashing itself fails to begin, hold **FLASH**, tap
**RST**, release **FLASH**, then start the flash again.
