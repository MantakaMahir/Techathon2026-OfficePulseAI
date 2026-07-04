# Wokwi Link

Public Wokwi project: https://wokwi.com/projects/468577668843534337

Built circuit scope:

| Part | Quantity | Purpose |
| --- | ---: | --- |
| ESP32 DevKit | 1 | Reads switches and sends optional telemetry |
| Slide/push switches | 5 | 3 lights + 2 fans |
| Yellow LEDs + 220 ohm resistors | 3 | Light load indicators |
| Blue LEDs + 220 ohm resistors | 2 | Fan load indicators |
| Potentiometer | 1 | Optional current sensor simulation on GPIO34 |

Screenshot: `hardware/wokwi-screenshot.png`.

Real AC fans/lights would require relay/SSR modules and isolation. The Wokwi circuit is a representative sensing/control proof.

Do not commit a generated Wokwi `diagram.json` for this challenge. The problem statement asks for schematic guidance rather than exported simulator JSON.

## Local opencode MCP

This repo includes `opencode.json` for a project-local Wokwi MCP server. The binary is ignored at `.opencode/bin/`, so each collaborator can reinstall it locally:

```powershell
New-Item -ItemType Directory -Path ".opencode\bin" -Force
Invoke-WebRequest -Uri "https://github.com/wokwi/wokwi-cli/releases/download/v0.26.1/wokwi-cli-win-x64.exe" -OutFile ".opencode\bin\wokwi-cli.exe"
setx WOKWI_CLI_TOKEN "your-wokwi-ci-token"
```

Restart opencode after setting the token.
