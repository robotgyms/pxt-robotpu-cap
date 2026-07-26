# pxt-robotpu-cap — CogniCap for Robot PU

## Overview

`pxt-robotpu-cap` is a MakeCode extension for the BBC micro:bit V2 that adds the **CogniCap** smart hat to [Robot PU](https://robotgyms.com/pu).

CogniCap is an **ESP32-S3** smart-hat accessory (ESP32-S3-WROOM + **OV5640** camera + microphone) running the RobotEU firmware. It adds:

- **AI vision** (face, soccer ball, soccer goal detection)
- **Voice commands** through WakeNet wake-word and MultiNet command recognition
- **Reinforcement learning** Q-table code built into CogniCap; together with the micro:bit RL code, Robot PU develops its own personality after you interact with it for a while
- **High-level tracking and soccer helpers** (face tracking, ball follow, search)

The micro:bit polls CogniCap over I2C for object locations and voice action tokens, then uses `pxt-robotpu-pro` blocks to move the robot. The extension only runs on micro:bit V2.

## Hardware

- Robot PU (micro:bit V2 compatible)
- CogniCap smart hat (ESP32-S3-WROOM, OV5640 camera, microphone, I2C hub)

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

### Attention

- `attention state` — current 3-bit state built from face, voice and sound spikes.
- `attention reward` — reward score from the recent face/voice/sound counters.
- `attention action` — update the Q-table with the last reward and return the best action for the current state.
- `set attention sound threshold <threshold>` — sound level over which a microphone sample counts as a spike.
- `set attention explore <percent>` — chance (0..100) of picking a random action for exploration.
- `reset attention counters` — clear the face/voice/sound counters.

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
        robotPuCap.searchForBall();
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
