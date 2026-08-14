# Firmware layout reference

## ESP-IDF

```bash
idf.py build
# binaries land in build/
```

| File | Offset (ESP32) | Offset (S3 / C3) |
|---|---|---|
| `bootloader/bootloader.bin` | `0x1000` | `0x0` |
| `partition_table/partition-table.bin` | `0x8000` | `0x8000` |
| `ota_data_initial.bin` | `0xe000` | `0xe000` |
| `your-app.bin` | `0x10000` | `0x10000` |

## Arduino IDE (ESP32)

`Sketch → Export Compiled Binary` produces a single merged `.bin`.
Publish it at offset `0x0` if it was exported as a merged image, or at
`0x10000` if it's the application image only.

## Arduino AVR (Uno / Nano / Mega)

Enable verbose output in Preferences and copy the `.hex` path from the build
log. Publish the `.hex` at offset `0`; the flasher handles STK500 paging.

## Merging into one file

```bash
esptool.py --chip esp32 merge_bin -o merged.bin \
  --flash_mode dio --flash_freq 40m --flash_size 4MB \
  0x1000 bootloader.bin \
  0x8000 partition-table.bin \
  0x10000 firmware.bin
```

Then publish `merged.bin` at offset `0x0` — one part, fewer things to get wrong.
