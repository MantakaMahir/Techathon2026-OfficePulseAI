import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { io } from "socket.io-client";
import type { Alert, Device, OfficeState, RoomState, UsageSnapshot } from "@officepulse/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function App() {
  const [state, setState] = useState<OfficeState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchState().then(setState).catch((err: Error) => setError(err.message));
    const socket = io(API_URL, { transports: ["websocket", "polling"] });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("state:update", (nextState: OfficeState) => {
      setState(nextState);
      setError(null);
    });
    socket.on("connect_error", () => setError("Backend is not reachable yet."));

    return () => {
      socket.disconnect();
    };
  }, []);

  async function post(path: string) {
    const response = await fetch(`${API_URL}${path}`, { method: "POST" });
    if (!response.ok) throw new Error(await response.text());
    setState((await response.json()) as OfficeState);
  }

  if (!state) {
    return <Shell connected={connected} error={error}>Loading OfficePulse live state...</Shell>;
  }

  const worstRoom = [...state.rooms].sort((a, b) => b.powerW - a.powerW)[0];

  return (
    <Shell connected={connected} error={error}>
      <header className="hero-panel">
        <div>
          <p className="label">OfficePulse AI</p>
          <h1>Smart office power monitor</h1>
          <p className="hero-copy">
            One backend truth for 15 corrected v1.2 devices, the live dashboard, Discord replies, alerts, and optional Wokwi telemetry.
          </p>
        </div>
        <div className="time-chip">
          <span>{state.simulatedTime.mode}</span>
          <strong>{new Date(state.simulatedTime.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
          <small>{state.simulatedTime.officeHours}</small>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Office power summary">
        <Kpi label="Total power now" value={`${state.usage.totalPowerW}W`} detail={`Worst room: ${worstRoom?.name ?? "n/a"}`} tone="primary" />
        <Kpi label="Today estimated usage" value={`${state.usage.todayKwh.toFixed(2)} kWh`} detail="Calculated from live wattage" />
        <Kpi label="Devices ON" value={`${state.usage.devicesOn}/${state.usage.totalDevices}`} detail="2 fans + 3 lights per room" />
        <Kpi label="Active alerts" value={String(state.alerts.length)} detail={state.alerts[0]?.room ?? "No active room alert"} tone={state.alerts.length ? "danger" : "success"} />
      </section>

      <main className="dashboard-grid">
        <OfficeMap rooms={state.rooms} onToggle={(id) => post(`/api/sim/toggle/${id}`)} />
        <PowerPanel usage={state.usage} rooms={state.rooms} history={state.history} />
        <AlertsPanel alerts={state.alerts} recentAlerts={state.recentAlerts} />
        <Controls onPost={post} />
      </main>

      <section className="room-grid" aria-label="Room device panels">
        {state.rooms.map((room) => (
          <RoomCard key={room.id} room={room} onToggle={(id) => post(`/api/sim/toggle/${id}`)} />
        ))}
      </section>
    </Shell>
  );
}

function Shell({ connected, error, children }: { connected: boolean; error: string | null; children: ReactNode }) {
  return (
    <div className="app-shell">
      <nav className="topbar" aria-label="Application status">
        <div className="brand-mark" aria-hidden="true">OP</div>
        <div>
          <strong>OfficePulse AI</strong>
          <span>Live energy command center</span>
        </div>
        <div className={`live-pill ${connected ? "is-live" : ""}`}>
          <span aria-hidden="true" />
          {connected ? "Live connected" : "Connecting"}
        </div>
      </nav>
      {error ? <div className="error-banner">{error}</div> : null}
      {children}
    </div>
  );
}

function Kpi({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "primary" | "danger" | "success" }) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function OfficeMap({ rooms, onToggle }: { rooms: RoomState[]; onToggle: (id: string) => void }) {
  return (
    <section className="panel office-panel">
      <div className="panel-heading">
        <div>
          <p className="label">Top-view layout</p>
          <h2>Live office floor</h2>
        </div>
        <span>Click any device to toggle</span>
      </div>
      <div className="office-map">
        {rooms.map((room) => (
          <RoomZone key={room.id} room={room} onToggle={onToggle} />
        ))}
        <div className="entry">Entry</div>
      </div>
    </section>
  );
}

function RoomZone({ room, onToggle }: { room: RoomState; onToggle: (id: string) => void }) {
  const hasAlert = room.devicesOn > 0 && room.devices.some((device) => device.source === "demo");
  const lights = room.devices.filter((device) => device.type === "light");
  const fans = room.devices.filter((device) => device.type === "fan");

  return (
    <div className={`room-zone ${hasAlert ? "demo-room" : ""}`} data-room={room.id}>
      <div className="room-title">
        <strong>{room.name}</strong>
        <span>{room.powerW}W</span>
      </div>
      <div className="desks" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="sofa" aria-hidden="true" />
      {lights.map((device, index) => (
        <DeviceDot key={device.id} device={device} index={index} onToggle={onToggle} />
      ))}
      {fans.map((device, index) => (
        <DeviceDot key={device.id} device={device} index={index} onToggle={onToggle} />
      ))}
    </div>
  );
}

function DeviceDot({ device, index, onToggle }: { device: Device; index: number; onToggle: (id: string) => void }) {
  return (
    <button
      className={`device-dot ${device.type} ${device.status === "on" ? "is-on" : ""} pos-${device.type}-${index + 1}`}
      type="button"
      onClick={() => onToggle(device.id)}
      aria-label={`${device.room} ${device.name} is ${device.status}`}
    >
      {device.type === "fan" ? <span className="fan-blades" aria-hidden="true" /> : <span aria-hidden="true" />}
    </button>
  );
}

function PowerPanel({ usage, rooms, history }: { usage: UsageSnapshot; rooms: RoomState[]; history: UsageSnapshot[] }) {
  const chart = history.length ? history : [usage];
  const maxPower = Math.max(1, ...chart.map((item) => item.totalPowerW));
  const points = chart
    .map((item, index) => {
      const x = chart.length === 1 ? 0 : (index / (chart.length - 1)) * 100;
      const y = 42 - (item.totalPowerW / maxPower) * 38;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="panel power-panel">
      <div className="panel-heading">
        <div>
          <p className="label">Power panel</p>
          <h2>{usage.totalPowerW}W total</h2>
        </div>
        <span>{usage.todayKwh.toFixed(2)} kWh today</span>
      </div>
      <svg className="sparkline" viewBox="0 0 100 44" role="img" aria-label="Power usage trend">
        <polyline points={points} />
      </svg>
      <div className="room-bars">
        {rooms.map((room) => (
          <div key={room.id} className="room-bar">
            <span>{room.name}</span>
            <meter min="0" max="165" value={room.powerW} />
            <strong>{room.powerW}W</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertsPanel({ alerts, recentAlerts }: { alerts: Alert[]; recentAlerts: Alert[] }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading">
        <div>
          <p className="label">Active alerts</p>
          <h2>{alerts.length ? `${alerts.length} needs attention` : "All clear"}</h2>
        </div>
      </div>
      <div className="alert-list">
        {(alerts.length ? alerts : recentAlerts.slice(0, 3)).map((alert) => (
          <article key={alert.id} className={`alert-card severity-${alert.severity} ${alert.isActive ? "active" : "resolved"}`}>
            <time>{new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            <strong>{alert.room ?? "Office"}</strong>
            <p>{alert.message}</p>
            <small>{alert.isActive ? alert.suggestedAction : "Resolved"}</small>
          </article>
        ))}
        {alerts.length === 0 && recentAlerts.length === 0 ? <p className="empty-state">No alerts yet. Use a demo scenario to show the judges the alert flow.</p> : null}
      </div>
    </section>
  );
}

function Controls({ onPost }: { onPost: (path: string) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, path: string) {
    setBusy(label);
    try {
      await onPost(path);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel controls-panel">
      <div className="panel-heading">
        <div>
          <p className="label">Demo controls</p>
          <h2>Force judge-visible scenarios</h2>
        </div>
      </div>
      <div className="button-stack">
        <button onClick={() => run("night", "/api/sim/scenario/night-forgotten")} disabled={busy !== null}>Simulate 10 PM forgotten devices</button>
        <button onClick={() => run("all-on", "/api/sim/scenario/all-on/work2")} disabled={busy !== null}>Force Work Room 2 all ON for 2+ hours</button>
        <button onClick={() => run("office", "/api/sim/time/office")} disabled={busy !== null}>Simulate office hours</button>
        <button onClick={() => run("reset", "/api/sim/reset")} disabled={busy !== null}>Reset office to normal</button>
      </div>
    </section>
  );
}

function RoomCard({ room, onToggle }: { room: RoomState; onToggle: (id: string) => void }) {
  return (
    <article className="room-card">
      <header>
        <div>
          <h3>{room.name}</h3>
          <span>{room.role}</span>
        </div>
        <strong>{room.powerW}W</strong>
      </header>
      <div className="device-list">
        {room.devices.map((device) => (
          <button key={device.id} className="device-row" type="button" onClick={() => onToggle(device.id)}>
            <span className={`status-light ${device.status}`} />
            <span>
              <strong>{device.name}</strong>
              <small>{new Date(device.lastChanged).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} via {device.source}</small>
            </span>
            <em className={device.status}>{device.status.toUpperCase()}</em>
            <b>{device.powerW}W</b>
          </button>
        ))}
      </div>
    </article>
  );
}

async function fetchState(): Promise<OfficeState> {
  const response = await fetch(`${API_URL}/api/state`);
  if (!response.ok) throw new Error("Could not load backend state.");
  return (await response.json()) as OfficeState;
}
