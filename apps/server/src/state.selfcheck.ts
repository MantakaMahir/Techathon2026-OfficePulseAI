import assert from "node:assert/strict";
import { allOnScenario, getState, nightForgottenScenario, resetOffice, toggleDevice } from "./state.js";

resetOffice();
let state = getState().state;
assert.equal(state.devices.length, 15);
assert.equal(state.usage.totalDevices, 15);

const before = state.usage.devicesOn;
state = toggleDevice("work1_fan_1").state;
assert.notEqual(state.usage.devicesOn, before);

state = nightForgottenScenario().state;
assert.ok(state.alerts.some((alert) => alert.type === "after_hours"));

state = allOnScenario("work2").state;
assert.ok(state.alerts.some((alert) => alert.type === "long_running_room"));

console.log("OfficePulse state self-check passed");
