# Wokwi Link

Paste the final public Wokwi project link here after building the representative circuit.

Recommended circuit scope:

| Part | Quantity | Purpose |
| --- | ---: | --- |
| ESP32 DevKit | 1 | Reads switches and sends optional telemetry |
| Slide/push switches | 5 | 3 lights + 2 fans |
| LEDs | 3 | Light load indicators |
| Small DC motor or fan symbol | 2 | Fan load indicators |
| Relay module symbols | 5 | Realistic isolation/control layer |
| Potentiometer | 1 | Optional current sensor simulation on GPIO34 |

Do not commit a generated Wokwi `diagram.json` for this challenge. The problem statement asks for schematic guidance rather than exported simulator JSON.

## Local opencode MCP

This repo includes `opencode.json` for a project-local Wokwi MCP server. The binary is ignored at `.opencode/bin/`, so each collaborator can reinstall it locally:

```powershell
New-Item -ItemType Directory -Path ".opencode\bin" -Force
Invoke-WebRequest -Uri "https://github.com/wokwi/wokwi-cli/releases/download/v0.26.1/wokwi-cli-win-x64.exe" -OutFile ".opencode\bin\wokwi-cli.exe"
setx WOKWI_CLI_TOKEN "your-wokwi-ci-token"
```

Restart opencode after setting the token.
