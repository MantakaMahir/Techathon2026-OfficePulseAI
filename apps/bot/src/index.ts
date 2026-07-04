import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { io } from "socket.io-client";
import { formatAlerts, formatRoomShort, formatStatus, formatUsage, humanizeFacts } from "@officepulse/ai";
import { normalizeRoomId, type Alert, type OfficeState, type RoomState, type UsageSnapshot } from "@officepulse/shared";

const token = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
const alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;

if (!token) {
  console.log("DISCORD_TOKEN is not set. Add it to .env, then run npm run dev:bot.");
  process.exit(0);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", () => {
  console.log(`OfficePulse bot logged in as ${client.user?.tag ?? "unknown"}`);
  subscribeToAlerts();
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!")) return;
  const [command, ...args] = message.content.slice(1).trim().split(/\s+/);
  const reply = await runCommand(command.toLowerCase(), args);
  await message.reply(reply);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const room = interaction.options.getString("room");
  const reply = await runCommand(interaction.commandName, room ? [room] : []);
  await interaction.reply(reply);
});

await client.login(token);

async function runCommand(command: string, args: string[]): Promise<string> {
  try {
    if (command === "help") return helpText();
    if (command === "status") return statusText();
    if (command === "room") return roomText(args[0]);
    if (command === "usage") return usageText();
    if (command === "alerts") return alertsText();
    if (command === "worst-room") return worstRoomText();
    if (command === "summary") return summaryText();
    return "I know `!status`, `!room work1`, `!usage`, `!alerts`, `!worst-room`, `!summary`, and `!help`.";
  } catch (error) {
    return `OfficePulse could not reach the backend: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

async function statusText(): Promise<string> {
  const state = await api<OfficeState>("/api/state");
  const facts = `${formatStatus(state)} Active alerts: ${state.alerts.length}.`;
  return humanizeFacts(facts, aiOptions());
}

async function roomText(value?: string): Promise<string> {
  if (!value) return "Tell me which room: `!room drawing`, `!room work1`, or `!room work2`.";
  const roomId = normalizeRoomId(value);
  if (!roomId) return "I could not match that room. Try `drawing`, `work1`, or `work2`.";
  const room = await api<RoomState>(`/api/rooms/${roomId}`);
  return humanizeFacts(`${formatRoomShort(room)} Current draw: ${room.powerW}W.`, aiOptions());
}

async function usageText(): Promise<string> {
  const usage = await api<UsageSnapshot>("/api/usage");
  return humanizeFacts(formatUsage(usage), aiOptions());
}

async function alertsText(): Promise<string> {
  const data = await api<{ active: Alert[] }>("/api/alerts");
  return formatAlerts(data.active);
}

async function worstRoomText(): Promise<string> {
  const state = await api<OfficeState>("/api/state");
  const room = [...state.rooms].sort((a, b) => b.powerW - a.powerW)[0];
  if (!room) return "No room data is available yet.";
  return humanizeFacts(`${room.name} is using the most power right now at ${room.powerW}W with ${room.devicesOn}/5 devices ON.`, aiOptions());
}

async function summaryText(): Promise<string> {
  const data = await api<{ summary: string }>("/api/summary");
  return data.summary;
}

function helpText(): string {
  return [
    "OfficePulse commands:",
    "`!status` office-wide live state",
    "`!room work1` room status",
    "`!usage` current watts and today kWh",
    "`!alerts` active alerts",
    "`!worst-room` highest consuming room",
    "`!summary` friendly AI-assisted summary"
  ].join("\n");
}

function subscribeToAlerts(): void {
  if (!alertChannelId) return;
  const socket = io(backendUrl, { transports: ["websocket", "polling"] });
  socket.on("alert:new", async (alert: Alert) => {
    const channel = await client.channels.fetch(alertChannelId);
    if (!channel?.isTextBased() || !("send" in channel)) return;
    await (channel as { send(content: string): Promise<unknown> }).send(`OfficePulse alert: ${alert.message} ${alert.suggestedAction}`);
  });
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

function aiOptions() {
  return { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL };
}

