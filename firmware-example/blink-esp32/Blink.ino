/*
 * Telugu Experiments Flasher — ESP32 test sketch
 *
 * Blinks the on-board LED and prints chip details over serial, so one flash
 * verifies the whole path: upload, boot, and the serial monitor.
 *
 * LED note: most ESP32 DevKit v1 boards put the blue LED on GPIO2 and it is
 * ACTIVE HIGH — HIGH turns it on. This is the opposite of the ESP8266
 * NodeMCU, where GPIO2 is active low. If your board has no on-board LED,
 * wire one to GPIO2 through a 220R resistor to GND.
 */

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const int LED_PIN = LED_BUILTIN;
unsigned long counter = 0;

void setup() {
  Serial.begin(115200);
  delay(300);                    // let USB-serial settle before printing

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);    // LOW = off (active high)

  uint64_t mac = ESP.getEfuseMac();

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F(" Telugu Experiments Flasher — ESP32 test"));
  Serial.println(F("========================================"));
  Serial.print  (F("Chip model : ")); Serial.println(ESP.getChipModel());
  Serial.print  (F("Revision   : ")); Serial.println(ESP.getChipRevision());
  Serial.print  (F("CPU cores  : ")); Serial.println(ESP.getChipCores());
  Serial.print  (F("CPU freq   : ")); Serial.print(getCpuFrequencyMhz()); Serial.println(F(" MHz"));
  Serial.print  (F("Flash size : ")); Serial.print(ESP.getFlashChipSize() / (1024 * 1024)); Serial.println(F(" MB"));
  Serial.print  (F("Free heap  : ")); Serial.print(ESP.getFreeHeap() / 1024); Serial.println(F(" KB"));
  Serial.print  (F("MAC        : "));
  for (int i = 5; i >= 0; i--) {
    Serial.printf("%02X", (uint8_t)(mac >> (i * 8)));
    if (i) Serial.print(':');
  }
  Serial.println();
  Serial.print  (F("LED on GPIO: ")); Serial.println(LED_PIN);
  Serial.println(F("Blinking every second…"));
  Serial.println();
}

void loop() {
  digitalWrite(LED_PIN, HIGH);   // on
  delay(500);
  digitalWrite(LED_PIN, LOW);    // off
  delay(500);

  Serial.print(F("blink #"));
  Serial.print(++counter);
  Serial.print(F("  uptime "));
  Serial.print(millis() / 1000);
  Serial.println(F("s"));
}
