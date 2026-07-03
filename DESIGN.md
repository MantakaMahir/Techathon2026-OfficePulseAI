# Design

## Intent

Mood phrase: late-evening facilities control room with teal instrument light and amber warning lamps.

OfficePulse is a product dashboard. The UI should feel operational, legible, and live, not decorative.

## Color Strategy

Restrained dark control-room palette with teal as the primary live-state color and amber as the warning/accent color.

```css
:root {
  --bg: oklch(0.105 0 0);
  --surface: oklch(0.165 0.018 190);
  --surface-strong: oklch(0.215 0.025 190);
  --ink: oklch(0.955 0.006 190);
  --muted: oklch(0.735 0.022 195);
  --primary: oklch(0.640 0.120 180);
  --accent: oklch(0.735 0.150 68);
  --danger: oklch(0.620 0.180 28);
  --success: oklch(0.700 0.145 145);
  --border: oklch(0.310 0.025 190);
}
```

## Typography

Use one UI family: `Inter`, `Segoe UI`, `system-ui`, sans-serif. Keep headings compact and data-forward. Use tabular numerals for power and kWh values.

## Components

KPI cards show the four rubric-critical facts first: total power, estimated kWh, devices on, active alerts.
The office map is the hero component and should visibly animate lights, fans, and room alert borders.
Room cards are dense status panels, not marketing cards.
Buttons use one shape vocabulary with visible hover and focus states.

## Motion

Only animate state: fan rotation, light glow, live connection pulse, and alert pulse. All animations must stop or simplify under `prefers-reduced-motion`.
