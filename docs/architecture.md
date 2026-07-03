# Architecture

OfficePulse AI is intentionally small and demo-reliable.

## Source Of Truth

The backend owns all live state. The dashboard never invents device values, and the Discord bot never uses hardcoded status replies. Both fetch the backend state or receive backend Socket.IO events.

## Flow

Simulated device layer updates the in-memory state store. Optional Wokwi telemetry can update the same store through `/api/iot/ingest`. The backend recalculates watts, kWh, room summaries, and alerts, then broadcasts Socket.IO events.

## Trade-offs

In-memory state is used instead of SQLite/Prisma for the hackathon MVP because the problem statement explicitly allows it, and the score depends more on live dashboard, Discord, Wokwi proof, diagrams, and demo quality. SQLite can be added later for historical reports without changing the dashboard or bot contracts.

## Reliability

The Wokwi circuit is optional for the live demo. If Wokwi networking is unavailable, the backend simulator still demonstrates the full dashboard, bot, and alert flow.
