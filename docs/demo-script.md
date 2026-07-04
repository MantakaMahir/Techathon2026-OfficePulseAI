# Demo Script Under 3 Minutes

## 0:00-0:20 Problem

This office runs on Discord, but lights and fans are left ON after work. The corrected v1.2 setup is 3 rooms with 2 fans and 3 lights each, so 15 devices total.

## 0:20-0:40 Architecture

Show `docs/system-diagram.svg`. Explain: simulator or Wokwi telemetry updates the backend; the backend is the single source of truth; dashboard and Discord bot read the same state.

## 0:40-1:20 Dashboard

Show KPI cards, live connected state, top-view office layout, glowing lights, rotating fans, room cards, and power breakdown.

## 1:20-1:50 Alerts

Click `Simulate 10 PM forgotten devices`. Show active alerts appearing without refresh. Then click `Force Work Room 2 all ON for 2+ hours` to show long-running room logic.

## 1:50-2:20 Discord Bot

Run `!status`, `!room work2`, `!usage`, and `!alerts`. Mention every command fetches the backend before replying, so it is not hardcoded.

## 2:20-2:40 Wokwi

Show `docs/hardware-schematic.svg`, `hardware/pin-mapping.md`, `hardware/wokwi-screenshot.png`, and the public Wokwi link. Explain ESP32 input switches, LED/fan indicators, real relay/SSR requirement for AC loads, and optional HTTP telemetry.

## 2:40-3:00 Wrap-up

Repeat the scoring proof: 15 devices, live data, shared backend, meaningful alerts, safe AI humanizer, and representative IoT circuit.
