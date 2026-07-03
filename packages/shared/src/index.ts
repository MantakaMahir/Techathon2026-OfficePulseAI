export type DeviceType = "fan" | "light";
export type DeviceStatus = "on" | "off";
export type SourceType = "simulator" | "dashboard" | "wokwi-esp32" | "demo";
export type TimeMode = "real" | "office" | "after-hours";

export interface RoomDefinition {
  id: string;
  name: string;
  role: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  room: string;
  status: DeviceStatus;
  powerW: number;
  ratedPowerW: number;
  lastChanged: string;
  turnedOnAt: string | null;
  source: SourceType;
}

export interface RoomState extends RoomDefinition {
  devices: Device[];
  powerW: number;
  devicesOn: number;
  fansOn: number;
  lightsOn: number;
  allOnSince: string | null;
}

export type AlertType = "after_hours" | "long_running_room" | "high_power" | "idle_room";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  roomId?: string;
  room?: string;
  message: string;
  suggestedAction: string;
  createdAt: string;
  resolvedAt: string | null;
  isActive: boolean;
}

export interface UsageSnapshot {
  totalPowerW: number;
  todayKwh: number;
  perRoom: Record<string, number>;
  devicesOn: number;
  totalDevices: number;
  timestamp: string;
}

export interface OfficeState {
  rooms: RoomState[];
  devices: Device[];
  usage: UsageSnapshot;
  alerts: Alert[];
  recentAlerts: Alert[];
  history: UsageSnapshot[];
  simulatedTime: {
    mode: TimeMode;
    now: string;
    officeHours: string;
  };
}

export interface IotIngestPayload {
  room: string;
  source?: SourceType;
  devices: Array<{ id: string; status: DeviceStatus }>;
}

export const ROOM_DEFS: RoomDefinition[] = [
  { id: "drawing", name: "Drawing Room", role: "Waiting area" },
  { id: "work1", name: "Work Room 1", role: "Employee workspace" },
  { id: "work2", name: "Work Room 2", role: "Employee workspace" }
];

export const DEVICE_POWER: Record<DeviceType, number> = {
  fan: 60,
  light: 15
};

export const TOTAL_DEVICES = 15;

export const ROOM_ALIASES: Record<string, string> = {
  drawing: "drawing",
  draw: "drawing",
  waiting: "drawing",
  work1: "work1",
  "work-1": "work1",
  room1: "work1",
  workroom1: "work1",
  work2: "work2",
  "work-2": "work2",
  room2: "work2",
  workroom2: "work2"
};

export function normalizeRoomId(value: string): string | null {
  return ROOM_ALIASES[value.trim().toLowerCase().replace(/\s+/g, "")] ?? null;
}

export function deviceRatedPower(type: DeviceType): number {
  return DEVICE_POWER[type];
}

export function createSeedDevices(nowIso: string): Device[] {
  return ROOM_DEFS.flatMap((room) => {
    const fans = [1, 2].map((n) => createDevice(room, "fan", n, nowIso));
    const lights = [1, 2, 3].map((n) => createDevice(room, "light", n, nowIso));
    return [...fans, ...lights];
  });
}

function createDevice(room: RoomDefinition, type: DeviceType, n: number, nowIso: string): Device {
  const id = `${room.id}_${type}_${n}`;
  const status = initialStatus(room.id, type, n);
  const ratedPowerW = deviceRatedPower(type);
  return {
    id,
    name: `${title(type)} ${n}`,
    type,
    roomId: room.id,
    room: room.name,
    status,
    powerW: status === "on" ? ratedPowerW : 0,
    ratedPowerW,
    lastChanged: nowIso,
    turnedOnAt: status === "on" ? nowIso : null,
    source: "simulator"
  };
}

function initialStatus(roomId: string, type: DeviceType, n: number): DeviceStatus {
  if (roomId === "work1") return n === 1 && type === "light" ? "on" : "off";
  if (roomId === "work2") return type === "fan" || n <= 2 ? "on" : "off";
  return type === "light" || n === 1 ? "on" : "off";
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
