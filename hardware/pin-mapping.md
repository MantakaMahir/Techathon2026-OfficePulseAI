# Wokwi Representative Room Pin Mapping

This is a one-room schematic for the Drawing Room. The full software system still tracks all 15 devices through the backend simulator.

| Device | Input switch GPIO | Output/relay GPIO | Simulated wattage |
| --- | ---: | ---: | ---: |
| Light 1 | GPIO 32 | GPIO 14 | 15W |
| Light 2 | GPIO 33 | GPIO 12 | 15W |
| Light 3 | GPIO 25 | GPIO 13 | 15W |
| Fan 1 | GPIO 26 | GPIO 18 | 60W |
| Fan 2 | GPIO 27 | GPIO 19 | 60W |
| Room current sensor | GPIO 34 ADC | n/a | Optional |

## Wiring Notes

Use `INPUT_PULLUP` for switches. Connect one side of each switch to the GPIO input and the other side to GND. Pressed or closed means ON because the input reads LOW.

Use output pins to drive LED or motor symbols in Wokwi. In real hardware, these pins would drive relay or SSR modules, not lights or fans directly.

## Electrical Reasoning

An ESP32 GPIO cannot safely drive real AC lights or fans. Real deployment needs opto-isolated relay/SSR modules and properly rated current sensors. The Wokwi circuit is a physical-sense proof: switches represent wall-switch state, LEDs represent lights, small motors represent fans, and the ADC input can represent room current.

## Optional Backend Telemetry

The firmware can POST this shape to `/api/iot/ingest`:

```json
{
  "room": "drawing",
  "source": "wokwi-esp32",
  "devices": [
    { "id": "drawing_light_1", "status": "on" },
    { "id": "drawing_fan_1", "status": "off" }
  ]
}
```
