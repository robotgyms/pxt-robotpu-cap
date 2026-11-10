---
name: Simple Ball Following
description: Easy version — see the ball, follow it; lose the ball, search for it.
---

# Simple Ball Following

The robot drives toward the ball while it can see it, and sweeps its head to find the ball again when it can't. Two blocks in a loop.

## What you need

- micro:bit V2 + Robot PU + CogniCap
- A bright coloured ball, ~10 cm, on the floor

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2, 0.76)
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball)
    }
    basic.pause(10)
})
```

## How it works

1. `objectDetected(Ball)` asks: is the ball in the latest camera packet?
2. `follow` drives toward it, holding ~150 mm: speed comes from the distance error, turning from the ball's angle. It also coasts through brief dropouts.
3. `search for` sweeps the head through a scan pattern when the ball is lost, so it gets reacquired instead of wandering blind.

## Try it

- Put the ball in front → the robot walks to it and stops ~150 mm away.
- Move the ball slowly → it follows.
- Hide the ball → head sweeps; show it again → following resumes.

## Tune it

- `distance` (150 mm): how close it stops.
- `speedGain` / `turnGain` / `decay`: approach speed, steering sharpness, and how much it coasts when the ball flickers out.

## What's next

- [Ball Following](ball-following.md) — the same behaviour plus tuning notes
- [Object Following](object-following.md) — the `follow` loop written out by hand
