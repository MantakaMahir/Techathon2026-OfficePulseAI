import type { Alert, OfficeState, RoomState, UsageSnapshot } from "@officepulse/shared";

export interface HumanizeOptions {
  apiKey?: string;
  model?: string;
}

export function formatStatus(state: OfficeState): string {
  return state.rooms.map(formatRoomShort).join(" ");
}

export function formatRoomShort(room: RoomState): string {
  const fanText = room.fansOn === 2 ? "2 fans ON" : room.fansOn === 1 ? "1 fan ON" : "fans off";
  const lightText = room.lightsOn === 3 ? "3 lights ON" : room.lightsOn === 1 ? "1 light ON" : room.lightsOn === 0 ? "lights off" : `${room.lightsOn} lights ON`;
  return `${room.name}: ${room.devicesOn === 0 ? "all off" : `${fanText}, ${lightText}`}.`;
}

export function formatUsage(usage: UsageSnapshot): string {
  return `Total power right now: ${usage.totalPowerW}W. Today's estimated usage: ${usage.todayKwh.toFixed(2)} kWh.`;
}

export function formatAlerts(alerts: Alert[]): string {
  const active = alerts.filter((alert) => alert.isActive);
  if (active.length === 0) return "No active alerts. The office looks under control.";
  return active.map((alert) => `${alert.severity.toUpperCase()}: ${alert.message} ${alert.suggestedAction}`).join("\n");
}

export async function humanizeFacts(facts: string, options: HumanizeOptions = {}): Promise<string> {
  if (!options.apiKey) return fallbackHumanize(facts);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are OfficePulse, a friendly office energy assistant. Rewrite facts in 1-2 concise sentences. Never invent numbers, rooms, devices, or alerts."
        },
        { role: "user", content: `Facts:\n${facts}` }
      ],
      temperature: 0.2,
      max_tokens: 140
    })
  });

  if (!response.ok) return fallbackHumanize(facts);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || fallbackHumanize(facts);
}

function fallbackHumanize(facts: string): string {
  return `OfficePulse check: ${facts.replace(/\s+/g, " ").trim()}`;
}
