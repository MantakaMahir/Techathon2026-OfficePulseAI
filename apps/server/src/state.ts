import {
  createSeedDevices,
  DEVICE_POWER,
  normalizeRoomId,
  ROOM_DEFS,
  TOTAL_DEVICES,
  type Alert,
  type AlertSeverity,
  type AlertType,
  type Device,
  type DeviceStatus,
  type IotIngestPayload,
  type OfficeState,
  type RoomState,
  type SourceType,
  type TimeMode,
  type UsageSnapshot
} from "@officepulse/shared";

interface AlertDraft {
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  roomId?: string;
  room?: string;
  message: string;
  suggestedAction: string;
}

export interface StateChange {
  state: OfficeState;
  newAlerts: Alert[];
  resolvedAlerts: Alert[];
}

let timeMode: TimeMode = "real";
let devices = createSeedDevices(new Date().toISOString());
let alerts: Alert[] = [];
let history: UsageSnapshot[] = [];
let todayKwh = 0;
let lastEnergyAt = Date.now();
let alertCounter = 1;

export function getState(recordHistory = false): StateChange {
  return finalize(recordHistory);
}

export function toggleDevice(deviceId: string): StateChange {
  const device = findDevice(deviceId);
  setDevice(device, device.status === "on" ? "off" : "on", "dashboard");
  return finalize(true);
}

export function setTimeMode(mode: TimeMode): StateChange {
  timeMode = mode;
  return finalize(true);
}

export function nightForgottenScenario(): StateChange {
  timeMode = "after-hours";
  const oldIso = minutesAgoIso(145);
  for (const device of devices) {
    const shouldBeOn = device.roomId === "work2" || (device.roomId === "drawing" && device.type === "light" && device.name !== "Light 3");
    setDevice(device, shouldBeOn ? "on" : "off", "demo", oldIso, true);
  }
  return finalize(true);
}

export function allOnScenario(roomIdOrAlias = "work2"): StateChange {
  const roomId = normalizeRoomId(roomIdOrAlias) ?? roomIdOrAlias;
  assertRoom(roomId);
  const oldIso = minutesAgoIso(135);
  for (const device of devices.filter((item) => item.roomId === roomId)) {
    setDevice(device, "on", "demo", oldIso, true);
  }
  return finalize(true);
}

export function resetOffice(): StateChange {
  timeMode = "office";
  const now = nowIso();
  devices = createSeedDevices(now).map((device) => ({ ...device, source: "demo" }));
  alerts = alerts.map((alert) => (alert.isActive ? { ...alert, isActive: false, resolvedAt: now } : alert));
  todayKwh = 0;
  history = [];
  lastEnergyAt = Date.now();
  return finalize(true);
}

export function ingestIot(payload: IotIngestPayload): StateChange {
  const roomId = normalizeRoomId(payload.room) ?? payload.room;
  assertRoom(roomId);
  if (!Array.isArray(payload.devices)) throw new Error("devices must be an array");

  for (const incoming of payload.devices) {
    if (incoming.status !== "on" && incoming.status !== "off") throw new Error(`Invalid status for ${incoming.id}`);
    const device = findDevice(incoming.id);
    if (device.roomId !== roomId) throw new Error(`${incoming.id} does not belong to ${roomId}`);
    setDevice(device, incoming.status, payload.source ?? "wokwi-esp32");
  }

  return finalize(true);
}

export function simulatorTick(): StateChange {
  const current = currentDate();
  const afterHours = isAfterHours(current);
  const onTarget = afterHours ? 0.18 : 0.68;
  const candidate = devices[Math.floor(Math.random() * devices.length)];
  if (!candidate) return finalize(true);

  // ponytail: simple stochastic simulator; replace with occupancy schedules if realism becomes a judging focus.
  const shouldBeOn = Math.random() < onTarget;
  if (candidate.status !== (shouldBeOn ? "on" : "off")) setDevice(candidate, shouldBeOn ? "on" : "off", "simulator");

  if (afterHours && Math.random() < 0.18) {
    for (const device of devices.filter((item) => item.roomId === "work2" && item.type === "light")) {
      setDevice(device, "on", "simulator", minutesAgoIso(40));
    }
  }

  return finalize(true);
}

function finalize(recordHistory: boolean): StateChange {
  applyEnergy();
  const beforeActive = new Set(alerts.filter((alert) => alert.isActive).map((alert) => alert.id));
  const drafts = detectAlerts();
  reconcileAlerts(drafts);
  const state = buildState();
  if (recordHistory) pushHistory(state.usage);
  return {
    state,
    newAlerts: state.alerts.filter((alert) => !beforeActive.has(alert.id)),
    resolvedAlerts: state.recentAlerts.filter((alert) => !alert.isActive && beforeActive.has(alert.id))
  };
}

function buildState(): OfficeState {
  const rooms = buildRooms();
  const usage = buildUsage(rooms);
  return {
    rooms,
    devices: devices.map((device) => ({ ...device })),
    usage,
    alerts: alerts.filter((alert) => alert.isActive).map((alert) => ({ ...alert })),
    recentAlerts: alerts.slice(-12).reverse().map((alert) => ({ ...alert })),
    history,
    simulatedTime: {
      mode: timeMode,
      now: nowIso(),
      officeHours: "09:00-17:00 Asia/Dhaka"
    }
  };
}

function buildRooms(): RoomState[] {
  return ROOM_DEFS.map((room) => {
    const roomDevices = devices.filter((device) => device.roomId === room.id);
    const onDevices = roomDevices.filter((device) => device.status === "on");
    return {
      ...room,
      devices: roomDevices.map((device) => ({ ...device })),
      powerW: onDevices.reduce((sum, device) => sum + device.powerW, 0),
      devicesOn: onDevices.length,
      fansOn: onDevices.filter((device) => device.type === "fan").length,
      lightsOn: onDevices.filter((device) => device.type === "light").length,
      allOnSince: roomDevices.every((device) => device.status === "on")
        ? roomDevices.map((device) => device.turnedOnAt).filter(Boolean).sort().at(-1) ?? null
        : null
    };
  });
}

function buildUsage(rooms: RoomState[]): UsageSnapshot {
  const perRoom = Object.fromEntries(rooms.map((room) => [room.id, room.powerW]));
  const totalPowerW = rooms.reduce((sum, room) => sum + room.powerW, 0);
  return {
    totalPowerW,
    todayKwh: Number(todayKwh.toFixed(4)),
    perRoom,
    devicesOn: rooms.reduce((sum, room) => sum + room.devicesOn, 0),
    totalDevices: TOTAL_DEVICES,
    timestamp: nowIso()
  };
}

function detectAlerts(): AlertDraft[] {
  const rooms = buildRooms();
  const usage = buildUsage(rooms);
  const current = currentDate();
  const drafts: AlertDraft[] = [];

  for (const room of rooms) {
    if (isAfterHours(current) && room.devicesOn > 0) {
      drafts.push({
        key: `after_hours:${room.id}`,
        type: "after_hours",
        severity: "warning",
        roomId: room.id,
        room: room.name,
        message: `${room.name} still has ${room.fansOn} fan${room.fansOn === 1 ? "" : "s"} and ${room.lightsOn} light${room.lightsOn === 1 ? "" : "s"} ON after office hours.`,
        suggestedAction: "Ask the nearest team member to switch them off."
      });
    }

    if (room.allOnSince && minutesBetween(room.allOnSince, current) >= 120) {
      drafts.push({
        key: `long_running_room:${room.id}`,
        type: "long_running_room",
        severity: "critical",
        roomId: room.id,
        room: room.name,
        message: `${room.name} has all 2 fans and 3 lights ON for more than 2 hours.`,
        suggestedAction: "Check if the room is occupied or shut down the full room."
      });
    }

    const oldestChangeMinutes = Math.min(...room.devices.map((device) => minutesBetween(device.lastChanged, current)));
    if (room.devicesOn === 5 && oldestChangeMinutes >= 90) {
      drafts.push({
        key: `idle_room:${room.id}`,
        type: "idle_room",
        severity: "warning",
        roomId: room.id,
        room: room.name,
        message: `${room.name} has every device ON with no recent switch changes.`,
        suggestedAction: "Confirm occupancy before another hour of wasted power."
      });
    }
  }

  if (usage.totalPowerW > 300) {
    drafts.push({
      key: "high_power:office",
      type: "high_power",
      severity: "warning",
      message: `Total office draw is ${usage.totalPowerW}W, above the 300W demo threshold.`,
      suggestedAction: "Start with the room using the most power."
    });
  }

  return drafts;
}

function reconcileAlerts(drafts: AlertDraft[]): void {
  const now = nowIso();
  const activeDraftKeys = new Set(drafts.map((draft) => draft.key));

  alerts = alerts.map((alert) => {
    if (alert.isActive && !activeDraftKeys.has(alert.key)) return { ...alert, isActive: false, resolvedAt: now };
    return alert;
  });

  for (const draft of drafts) {
    const active = alerts.find((alert) => alert.key === draft.key && alert.isActive);
    if (active) {
      active.message = draft.message;
      active.suggestedAction = draft.suggestedAction;
      continue;
    }

    alerts.push({
      id: `alert_${String(alertCounter++).padStart(3, "0")}`,
      ...draft,
      createdAt: now,
      resolvedAt: null,
      isActive: true
    });
  }

  alerts = alerts.slice(-60);
}

function setDevice(device: Device, status: DeviceStatus, source: SourceType, changedAt = nowIso(), force = false): void {
  if (!force && device.status === status && device.source === source) return;
  device.status = status;
  device.powerW = status === "on" ? DEVICE_POWER[device.type] : 0;
  device.lastChanged = changedAt;
  device.turnedOnAt = status === "on" ? changedAt : null;
  device.source = source;
}

function applyEnergy(): void {
  const now = Date.now();
  const deltaSeconds = Math.max(0, (now - lastEnergyAt) / 1000);
  const totalPowerW = devices.reduce((sum, device) => sum + device.powerW, 0);
  todayKwh += (totalPowerW * deltaSeconds) / 3_600_000;
  lastEnergyAt = now;
}

function pushHistory(usage: UsageSnapshot): void {
  history = [...history, usage].slice(-36);
}

function findDevice(deviceId: string): Device {
  const device = devices.find((item) => item.id === deviceId);
  if (!device) throw new Error(`Unknown device: ${deviceId}`);
  return device;
}

function assertRoom(roomId: string): void {
  if (!ROOM_DEFS.some((room) => room.id === roomId)) throw new Error(`Unknown room: ${roomId}`);
}

function currentDate(): Date {
  const date = new Date();
  if (timeMode === "office") date.setHours(11, 0, 0, 0);
  if (timeMode === "after-hours") date.setHours(22, 0, 0, 0);
  return date;
}

function nowIso(): string {
  return currentDate().toISOString();
}

function minutesAgoIso(minutes: number): string {
  return new Date(currentDate().getTime() - minutes * 60_000).toISOString();
}

function minutesBetween(iso: string, end: Date): number {
  return Math.max(0, (end.getTime() - new Date(iso).getTime()) / 60_000);
}

function isAfterHours(date: Date): boolean {
  const hour = date.getHours();
  return hour < 9 || hour >= 17;
}
