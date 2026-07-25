# pxt-robotpu-cap — CogniCap for Robot PU

## Overview

`pxt-robotpu-cap` is a MakeCode extension for the BBC micro:bit V2 that adds the **CogniCap** smart hat to [Robot PU](https://robotgyms.com/pu).

CogniCap uses an **ESP32-S3** co-processor to add:

- **AI vision** (face, soccer ball, soccer goal detection)
- **Voice command** recognition
- **Q-table reinforcement learning**
- **High-level tracking and soccer helpers** (face tracking, ball follow, search)

This extension sits on top of `pxt-robotpu-pro` and only runs on micro:bit V2.

## Hardware

- Robot PU (micro:bit V2 compatible)
- CogniCap smart hat (ESP32-S3, camera, microphone, I2C mux)

## Blocks

Open MakeCode, add this extension, and look for the **CogniCap** category.

### Setup

- `start CogniCap` — power up the ESP32-S3 pipeline and start I2C packet polling.
- `stop CogniCap` — stop the background loops.
- `enable <face/ball/goal> detection <true/false>` — toggle a detection service.

### Vision

- `<face/ball/goal> detected` — returns `true` when the object is seen and fresh.
- `<face/ball/goal> x (mm)` / `y (mm)` — ground-plane position from the camera.
- `<face/ball/goal> width` / `height` — bounding box size in pixels.
- `<face/ball/goal> yaw` / `pitch` — head angle to the object.

### Voice

- `voice command` — latest recognised command string (placeholder).

### Learning

- `reset Q-table` — clear the 64-state × 8-action table.
- `set Q reward state <state> action <action> reward <reward>` — store a reward.
- `Q value state <state> action <action>` — read a stored value.
- `best Q action for state <state>` — pick the action with the highest Q value.

### Tracking

- `track face` — keep the head centred on a face.

### Soccer

- `follow ball` — track the ball and compute walk speed/turn.
- `ball follow speed` / `ball follow turn` — read the computed values.
- `search for ball` — scan the head to reacquire a lost ball.

## Example: Face tracking

```typescript
robotPuCap.startCogniCap();
basic.forever(function () {
    robotPuCap.trackFace();
    basic.pause(20);
});
```

## Example: Ball following

```typescript
robotPuCap.startCogniCap();
basic.forever(function () {
    robotPuCap.followBall();
    robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
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
        robotPuCap.followBall();
        // Once close to the ball, turn toward the goal and kick.
        if (robotPuCap.objectY(robotPuCap.CapObject.Ball) < 200) {
            let goalYaw = Math.atan2(
                robotPuCap.objectX(robotPuCap.CapObject.Goal),
                robotPuCap.objectY(robotPuCap.CapObject.Goal)
            ) * 57.3;
            robotPuPro.walk(1, goalYaw * -0.02);
            if (Math.abs(goalYaw) < 15) robotPuPro.kick();
        } else {
            robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
        }
    } else if (ballSeen) {
        robotPuCap.followBall();
        robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
    } else {
        robotPuCap.searchForBall();
        robotPuPro.walk(0, 1);
    }
    basic.pause(20);
});
```

## Dependencies

This extension depends on `pxt-robotpu-pro`. Update the GitHub reference in `pxt.json` if your fork or tag differs.

## License

MIT
