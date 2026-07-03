# API Documentation

Base URL: `http://localhost:4000`.

## State

`GET /api/state`

Returns the complete source-of-truth state: rooms, all 15 devices, usage, active alerts, recent alerts, history, and simulated time.

## Rooms

`GET /api/rooms`

Returns all room panels.

`GET /api/rooms/:roomId`

Valid room IDs and aliases: `drawing`, `work1`, `work2`, `work-1`, `work-2`, `room1`, `room2`.

## Usage

`GET /api/usage`

Returns:

```json
{
  "totalPowerW": 285,
  "todayKwh": 3.8,
  "perRoom": { "drawing": 90, "work1": 30, "work2": 165 },
  "devicesOn": 8,
  "totalDevices": 15,
  "timestamp": "2026-07-03T18:42:00.000Z"
}
```

Energy formula:

```text
today_kWh += totalPowerW * deltaSeconds / 3,600,000
```

## Alerts

`GET /api/alerts`

Returns `{ active, recent }`.

Alert types: `after_hours`, `long_running_room`, `high_power`, `idle_room`.

## Simulator

`POST /api/sim/toggle/:deviceId`

Toggles a device such as `work2_fan_1`.

`POST /api/sim/scenario/night-forgotten`

Sets simulated time to after-hours and leaves devices ON.

`POST /api/sim/scenario/all-on/:roomId`

Forces all 5 devices in a room ON for more than 2 hours.

`POST /api/sim/time/:mode`

Modes: `real`, `office`, `after-hours`.

`POST /api/sim/reset`

Resets state and estimated kWh.

## Optional Wokwi Ingest

`POST /api/iot/ingest`

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

Socket.IO events emitted after state changes: `state:update`, `usage:update`, `alert:new`, `alert:resolved`.
