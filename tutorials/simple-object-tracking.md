---
name: Simple Object Tracking
description: Easy version — the head follows a face with one block in a loop.
---

# Simple Object Tracking

Point Robot PU's head at a face and keep it there. One block does all the work — smoothing, follow-through, and the "searching" eye blink.

## What you need

- micro:bit V2 + Robot PU + CogniCap (see [Hello, CogniCap](hello-cognicap.md) for setup)

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])

basic.forever(function () {
    robotPuCap.headTrackObject(robotPuCap.CapObject.Face)
    basic.pause(20)
})
```

## How it works

1. `start CogniCap` powers the camera; `enable detections [face]` turns on just the face service.
2. `head track %object` reads the latest face angle every tick and steps the head yaw/pitch servos toward it.
3. While the face is visible the eyes stay dim; if the face drops out the block keeps looking and blinks the eyes brighter — nothing else to write.

## Try it

1. Flash and wait for the camera to boot.
2. Move left and right slowly → the head follows.
3. Step out of view → the eyes brighten while it searches.

## Tune it

- `head track %object with gain %trackGain and speed %trackSpeed` — raise gain (default `0.05`) for a snappier head, raise speed (default `0.3`) for faster steps. Too high → oscillation.
- Swap `Face` for `Ball` or `Goal` to track other objects.

## What's next

- [Object Tracking](object-tracking.md) — the same loop written out by hand, so you can tweak every step
