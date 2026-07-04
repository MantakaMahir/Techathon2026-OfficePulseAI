import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { humanizeFacts, formatAlerts, formatStatus, formatUsage } from "@officepulse/ai";
import { normalizeRoomId, type TimeMode } from "@officepulse/shared";
import {
  allOnScenario,
  getState,
  ingestIot,
  isSimulatorActive,
  nightForgottenScenario,
  resetOffice,
  setSimulatorActive,
  setTimeMode,
  simulatorTick,
  toggleDevice,
  type StateChange
} from "./state.js";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: corsOrigin }
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "80kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "officepulse-server" });
});

app.get("/api/state", (_req, res) => {
  res.json(getState().state);
});

app.get("/api/rooms", (_req, res) => {
  res.json(getState().state.rooms);
});

app.get("/api/rooms/:roomId", (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId) ?? req.params.roomId;
  const room = getState().state.rooms.find((item) => item.id === roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

app.get("/api/usage", (_req, res) => {
  res.json(getState().state.usage);
});

app.get("/api/alerts", (_req, res) => {
  const state = getState().state;
  res.json({ active: state.alerts, recent: state.recentAlerts });
});

app.get("/api/summary", async (_req, res) => {
  const state = getState().state;
  const facts = `${formatStatus(state)} ${formatUsage(state.usage)} ${formatAlerts(state.alerts)}`;
  const summary = await humanizeFacts(facts, { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
  res.json({ facts, summary });
});

app.post("/api/sim/toggle/:deviceId", (req, res) => {
  const result = toggleDevice(req.params.deviceId);
  broadcast(result);
  res.json(result.state);
});

app.post("/api/sim/scenario/night-forgotten", (_req, res) => {
  const result = nightForgottenScenario();
  broadcast(result);
  res.json(result.state);
});

app.post("/api/sim/scenario/all-on", (_req, res) => {
  const result = allOnScenario("work2");
  broadcast(result);
  res.json(result.state);
});

app.post("/api/sim/scenario/all-on/:roomId", (req, res) => {
  const result = allOnScenario(req.params.roomId);
  broadcast(result);
  res.json(result.state);
});

app.post("/api/sim/reset", (_req, res) => {
  const result = resetOffice();
  broadcast(result);
  res.json(result.state);
});

app.post("/api/sim/mode/:mode", (req, res) => {
  setSimulatorActive(req.params.mode === "auto");
  res.json({ mode: isSimulatorActive() ? "auto" : "manual" });
});

app.post("/api/sim/time/:mode", (req, res) => {
  const mode = req.params.mode as TimeMode;
  if (!["real", "office", "after-hours"].includes(mode)) return res.status(400).json({ error: "Invalid time mode" });
  const result = setTimeMode(mode);
  broadcast(result);
  res.json(result.state);
});

app.post("/api/iot/ingest", (req, res) => {
  const result = ingestIot(req.body);
  broadcast(result);
  res.json({ ok: true, state: result.state });
});

io.on("connection", (socket) => {
  socket.emit("state:update", getState().state);
});

setInterval(() => { if (isSimulatorActive()) broadcast(simulatorTick()); }, 7000);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: err.message || "Request failed" });
});

server.listen(port, () => {
  console.log(`OfficePulse API listening on http://localhost:${port}`);
});

function broadcast(change: StateChange): void {
  io.emit("state:update", change.state);
  io.emit("usage:update", change.state.usage);
  for (const alert of change.newAlerts) io.emit("alert:new", alert);
  for (const alert of change.resolvedAlerts) io.emit("alert:resolved", alert);
}
