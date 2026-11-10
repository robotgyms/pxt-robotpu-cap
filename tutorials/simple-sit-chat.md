---
name: Simple Sit and Chat
description: Easy version — sit down, watch for a face, and chat when one appears.
---

# Simple Sit and Chat

Robot PU sits, scans the room, and when a face shows up it watches and occasionally says hello.

## What you need

- micro:bit V2 + Robot PU + CogniCap
- Robot PU voice extension for `robotpuVoice`

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)
robotPuPro.start(robotPuPro.Action.Sit, 0)

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        robotPuCap.headTrackObject(robotPuCap.CapObject.Face)
        if (randint(0, 99) == 1) {
            robotpuVoice.say("Hi there!")
        }
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Face)
    }
    basic.pause(30)
})
```

## How it works

1. `start sit` keeps the robot seated — the whole program stays simple because the body never moves.
2. `search for` sweeps the head while nobody is around, so a face gets found again.
3. On a face: `head track` watches it, and a random roll says a line every few seconds.

## Try it

- Leave the robot alone → head sweeps the room.
- Walk into view → it locks on and chats.

## What's next

- [Sit, Watch, and Chat](sit-watch-chat.md) — conversation lists, head-scan waypoints, talk timing
