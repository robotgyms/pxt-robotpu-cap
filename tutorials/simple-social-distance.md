---
name: Simple Social Distance
description: Easy version — follow a face, but back away if it gets too close.
---

# Simple Social Distance

The robot keeps a comfort bubble: it follows your face when you're far, and backs away when you step too close.

## What you need

- micro:bit V2 + Robot PU + CogniCap

## The program

```typescript
const COMFORT = 500  // mm — the bubble radius

robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        if (robotPuCap.objectY(robotPuCap.CapObject.Face) < COMFORT) {
            robotPuPro.walk(-2, 0)   // too close — back away
        } else {
            robotPuCap.followObject(robotPuCap.CapObject.Face, COMFORT, 0.4, -0.2, 0.76)
        }
    }
    basic.pause(30)
})
```

## How it works

1. `objectY` is the forward distance to the face in mm — under `COMFORT` and you're inside the bubble.
2. Inside the bubble: `walk(-2, 0)` backs straight up. Outside: `follow` holds ~500 mm on its own.
3. Between the two, the robot naturally settles at about arm's length.

## Try it

- Stand far → it walks up to 500 mm.
- Step into its face → it backs away.
- Change `COMFORT` to grow or shrink the bubble.

## What's next

- [Social Distance](social-distance.md) — hysteresis so it doesn't flicker at the boundary, plus complaints when you crowd it
