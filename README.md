# pxt-robotpu-cap — CogniCap for Robot PU

## Overview

`pxt-robotpu-cap` is a MakeCode extension for the BBC micro:bit V2 that adds the **CogniCap** smart hat to [Robot PU](https://robotgyms.com/pu).

CogniCap is an **ESP32-S3** smart-hat accessory (ESP32-S3-WROOM + **OV5640** camera + microphone). It adds:

- **AI vision** (face, soccer ball, soccer goal detection, and any future objects through the same generic API)
- **Voice commands** through WakeNet wake-word and MultiNet command recognition
- **Reinforcement learning** Q-table code built into CogniCap; together with the micro:bit RL code, Robot PU develops its own personality after you interact with it for a while
- **High-level tracking and following** with generic `headTrackObject`, `followObject`, and `searchForObject` blocks

The micro:bit polls CogniCap over I2C for object locations and voice action tokens. High-level blocks then drive Robot PU through `pxt-robotpu-pro`. The extension only runs on micro:bit V2.

## Design highlights

- **Compact, scalable I2C protocol**: Message types are split into segments (`0x00-0x0F` status/device, `0x10-0x1F` voice/audio, `0x20-0xFF` vision/detection). One packet parser handles all current and future vision objects.
- **Generic object API**: `CapObject.Face`, `CapObject.Ball`, and `CapObject.Goal` are passed to the same `objectDetected`, `headTrackObject`, `followObject`, and `searchForObject` blocks. New objects can be added without adding new blocks.
- **Service enabling by message type**: `enableDetection` uses the message type as the service key and keeps a per-service status dictionary, so services are automatically restored after a camera reboot.
- **CogniCap class is independent of `robotPuPro`**: `class CogniCap` only handles I2C parsing and dispatch. Any `robotPuPro` calls live in separate high-level helper blocks, keeping the core driver clean and reusable.

## Hardware

- Robot PU (micro:bit V2 compatible)
- CogniCap smart hat (ESP32-S3-WROOM, OV5640 camera, microphone, I2C hub)

## How to relase
Before release, must review everything with BBC MakeCode extension approval requirements.

All version numbers must start with a `v`, for example `v1.0.42`.

make release VERSION="v0.0.2"

## Blocks

Open MakeCode, add this extension, and look for the **CogniCap** category.

### Setup

- `start CogniCap` — power up the ESP32-S3 pipeline and start I2C packet polling.
- `stop CogniCap` — stop the background loops.
- `enable %object detection %enabled` — toggle a detection service by `CapObject`.
- `enable voice commands %enabled` — toggle voice command recognition.
- `print i2c packet` — print the last 18-byte packet to the serial console for debugging.

### I2C / Events

- `on i2c message type %type` — run code when a packet with the given type arrives.
- `on %object detected` — run code when the selected object is newly detected.
- `on wake word` — run code when the wake word is heard.
- `on voice action %action` — run code for a specific voice command token.
- `last action token` — the action/count byte from the last action or voice packet.

### Vision

- `%object detected` — returns `true` when the object is seen and fresh.
- `%object x (mm)` / `%object y (mm)` — ground-plane position from the camera.
- `%object width` / `%object height` — bounding box size in pixels.
- `%object yaw` / `%object pitch` — head angle to the object.
- `%object count` — detection count or score byte.

### Voice

- `voice command` — latest recognised command string (placeholder).

### Learning

- `reset Q-table` — clear the 64-state × 8-action table.
- `set Q reward state <state> action <action> reward <reward>` — store a reward.
- `Q value state <state> action <action>` — read a stored value.
- `best Q action for state <state>` — pick the action with the highest Q value.

### Attention

- `attention state` — current 3-bit state built from face, voice and sound spikes.
- `attention reward` — reward score from the recent face/voice/sound counters.
- `attention action` — update the Q-table with the last reward and return the best action for the current state.
- `set attention sound threshold <threshold>` — sound level over which a microphone sample counts as a spike.
- `set attention explore <percent>` — chance (0..100) of picking a random action for exploration.
- `reset attention counters` — clear the face/voice/sound counters.

### Tracking

- `head track %object pitch gain %pitchSpeedGain yaw gain %yawSpeedGain` — keep the head centred on the object.
- `follow %object distance %distance speed gain %speedGain turn gain %turnGain` — drive Robot PU toward the object while keeping the target distance.
- `search for %object` — scan the head to reacquire a lost object.

## Example: Face tracking

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.headTrackObject(robotPuCap.CapObject.Face, 0.2, 0.2);
    basic.pause(20);
});
```

## Example: Ball following

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
    basic.pause(5);
});
```

## Example: Robot soccer (simplified)

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    let ballSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Ball);
    let goalSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Goal);
    if (ballSeen && goalSeen) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
        if (robotPuCap.objectY(robotPuCap.CapObject.Ball) < 200) {
            let goalYaw = Math.atan2(
                robotPuCap.objectX(robotPuCap.CapObject.Goal),
                robotPuCap.objectY(robotPuCap.CapObject.Goal)
            ) * 57.3;
            robotPuPro.walk(1, goalYaw * -0.02);
            if (Math.abs(goalYaw) < 15) robotPuPro.kick();
        }
    } else if (ballSeen) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
        robotPuPro.walk(0, 1);
    }
    basic.pause(20);
});
```

## Example: Attention attractor

The robot watches for faces, voice commands and sound spikes. Each time `attention action` is called it rewards the previous action for the attention it received, then chooses the best action for the current 3-bit state. Over time it learns which `QAction` attracts the most attention.

```typescript
robotPuCap.startCogniCap();
robotPuCap.resetQTable();

function doAttractAction(action: number) {
    if (action == robotPuCap.QAction.Dance) {
        robotPuPro.setModeVar(robotPuPro.Mode.Dance);
    } else if (action == robotPuCap.QAction.Walk) {
        robotPuPro.walk(2, 0);
    } else if (action == robotPuCap.QAction.TurnLeft) {
        robotPuPro.walk(0, 1);
    } else if (action == robotPuCap.QAction.TurnRight) {
        robotPuPro.walk(0, -1);
    } else if (action == robotPuCap.QAction.Kick) {
        robotPuPro.kick();
    } else if (action == robotPuCap.QAction.Search) {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
    } else if (action == robotPuCap.QAction.Approach) {
        robotPuPro.walk(2, 0);
    } else {
        robotPuPro.setModeVar(robotPuPro.Mode.Rest);
    }
}

basic.forever(function () {
    let action = robotPuCap.attentionAction();
    doAttractAction(action);
    basic.pause(500);
});
```

## Dependencies

This extension depends on `pxt-robotpu-pro`. Update the GitHub reference in `pxt.json` if your fork or tag differs.

## License

MIT
