---
name: Simple Walkie-Talkie
description: Easy version — follow a face at chat distance and talk occasionally.
---

# Simple Walkie-Talkie

The robot follows your face from a comfortable distance and says a line now and then — a companion, not a tracker.

## What you need

- micro:bit V2 + Robot PU + CogniCap
- Robot PU voice extension for `robotpuVoice`

## The program

```typescript
let lines = ["Hi there!", "Where to?", "Nice day, huh?", "Beep boop."]

robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        robotPuCap.followObject(robotPuCap.CapObject.Face, 500, 0.4, -0.2, 0.76)
        if (randint(0, 199) == 1) {
            robotpuVoice.say(lines[randint(0, lines.length - 1)])
        }
    }
    basic.pause(50)
})
```

## How it works

1. `follow` walks the robot to ~500 mm from your face and holds that distance.
2. `randint(0, 199) == 1` speaks roughly once every 200 loops (~10 s).
3. `lines` is the whole conversation — add strings to make it chatty.

## Try it

- Walk backward → it follows at 500 mm. Lean in → it keeps the bubble.
- Wait quietly → a random line comes out every few seconds.

## What's next

- [Walkie-Talkie](walkie-talkie.md) — 30 conversation starters, walk-to-comfortable-distance tuning
