---
name: Simple Soccer
description: Easy version — find the ball, follow it, kick when close.
---

# Simple Soccer

Three rules: see the ball → chase it; ball close → kick; no ball → search.

## What you need

- micro:bit V2 + Robot PU + CogniCap
- A ball the robot can kick safely

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2, 0.76)
        if (robotPuCap.objectY(robotPuCap.CapObject.Ball) < 200) {
            robotPuPro.start(robotPuPro.Action.Kick, 1)
        }
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball)
    }
    basic.pause(20)
})
```

## How it works

1. `follow` chases the ball and holds ~150 mm — the same loop as [Simple Ball Following](simple-ball-following.md).
2. `objectY` is the ball's forward distance: under 200 mm the robot is close enough to kick, so it runs `start kick for 1 step`.
3. `search for` sweeps the head while the ball is missing.

## Try it

- Roll the ball near the robot → it chases, closes in, and kicks.
- Kick is a single action (`1` step), so it fires once per approach.

## Tune it

- `200` mm: kick range — raise it if the robot kicks short, lower it if it kicks air.
- Add the goal: check `objectDetected(Goal)` and only kick when the goal is also in view (see the full tutorial).

## What's next

- [Soccer Game](soccer-game.md) — align on the goal before kicking, and handle the lost-goal case
