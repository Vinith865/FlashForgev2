/*
 * TE Flasher test sketch — NodeMCU / ESP8266
 *
 * Blinks the on-board blue LED and prints to serial so you can verify both
 * the flash and the serial monitor in one go.
 *
 * NOTE: on NodeMCU the on-board LED is on GPIO2 (D4) and is ACTIVE LOW —
 * writing LOW turns it ON. That trips up nearly everyone the first time.
 */

#define LED_PIN LED_BUILTIN   // GPIO2 on NodeMCU / Wemos D1 mini

unsigned long counter = 0;

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // HIGH = off (active low)

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F(" TE Flasher — ESP8266 blink test"));
  Serial.println(F("========================================"));
  Serial.print(F("Chip ID   : ")); Serial.println(ESP.getChipId(), HEX);
  Serial.print(F("Flash size: ")); Serial.print(ESP.getFlashChipRealSize() / 1024); Serial.println(F(" KB"));
  Serial.print(F("SDK       : ")); Serial.println(ESP.getSdkVersion());
  Serial.println(F("Blinking every second…"));
  Serial.println();
}

void loop() {
  digitalWrite(LED_PIN, LOW);   // on
  delay(500);
  digitalWrite(LED_PIN, HIGH);  // off
  delay(500);

  Serial.print(F("blink #"));
  Serial.print(++counter);
  Serial.print(F("  uptime "));
  Serial.print(millis() / 1000);
  Serial.println(F("s"));
}
