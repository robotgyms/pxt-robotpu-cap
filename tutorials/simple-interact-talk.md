---
name: Simple Talk
description: Easy version — the robot tracks a face and randomly speaks to it.
---

# Simple Talk

Robot PU watches whoever is in front of it and occasionally says something. A face tracker plus a one-line random talker.

## What you need

- micro:bit V2 + Robot PU + CogniCap
- The Robot PU voice extension for `robotpuVoice`

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        robotPuCap.headTrackObject(robotPuCap.CapObject.Face)
        if (randint(0, 99) == 1) {
            robotpuVoice.say("I see you!")
        }
    }
    basic.pause(50)
})
```

## How it works

1. The `if` keeps everything quiet when nobody is there.
2. `head track` aims the head at the face every tick.
3. `randint(0, 99) == 1` fires about once per 100 loops (~5 s) — a random chat interval without any timers.

## Try it

- Stand in front → the head follows and the robot occasionally says "I see you!".
- Change the string, or make a list: `let lines = ["Hi!", "I see you!", "Beep boop"]` then `robotpuVoice.say(lines[randint(0, lines.length - 1)])`.

## What's next

- [Interact and Random Talk](interact-random-talk.md) — explore when the face is lost, 30 conversation starters
