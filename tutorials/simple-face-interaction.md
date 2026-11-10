---
name: Simple Face Interaction
description: Easy version — track a face and react when it is centred in view.
---

# Simple Face Interaction

The robot watches your face, and shows a happy icon when you are looking straight at it. Ten lines.

## What you need

- micro:bit V2 + Robot PU + CogniCap

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])

basic.forever(function () {
    robotPuCap.headTrackObject(robotPuCap.CapObject.Face)
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face) &&
        Math.abs(robotPuCap.objectYaw(robotPuCap.CapObject.Face)) < 10) {
        basic.showIcon(IconNames.Happy)
    } else {
        basic.clearScreen()
    }
    basic.pause(50)
})
```

## How it works

1. `head track %object` moves the head toward the face — the robot watches you.
2. `object yaw` is the face's horizontal angle: near `0` means the face is centred.
3. `objectDetected` guards the icon so a stale reading can't trigger it.

## Try it

- Look at the camera → head turns to you, and when it centres on your face the LED shows **Happy**.
- Move away → the icon clears.

## Tune it

- Change the `10` to make centred detection stricter (smaller) or looser (bigger).
- Swap `showIcon` for `robotPuPro.start(robotPuPro.Action.Greet, 1)` for a livelier reaction.

## What's next

- [Face Interaction](face-interaction.md) — add talking, centred-detection hysteresis, and a cooldown
