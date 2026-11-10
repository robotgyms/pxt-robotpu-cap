---
name: Simple Attention
description: Easy version — say "p u" to get the robot's attention, then command it.
---

# Simple Attention

Say the robot's name — **"p u"** (or "pew") — and it stands up and watches you. Say a real command and attention becomes action.

## What you need

- micro:bit V2 + Robot PU + CogniCap with microphone

## The program

```typescript
let attentive = false

robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])

// "p u" is token 30 — it has its own VoiceAction member
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Attention, function () {
    attentive = true
    robotPuPro.start(robotPuPro.Action.Stand, 0)
    robotPuPro.leftEyeBright(0.1)
    robotPuPro.rightEyeBright(0.1)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Rest, 0)
})

basic.forever(function () {
    if (attentive) {
        robotPuCap.headTrackObject(robotPuCap.CapObject.Face)
        basic.pause(10)
    } else {
        basic.pause(500)
    }
})
```

## How it works

1. The `attention` voice token (`p u`) sets `attentive = true` — the flag that turns the whole behaviour on.
2. While `attentive`, `head track` watches your face every tick — the robot is "listening" with its eyes.
3. `stop` clears the flag and rests — a real command ends attention.

## Try it

- Say the wake word, then **"p u"** → it stands and watches you.
- Move left and right → the head follows.
- Say **"stop"** → it relaxes.

## What's next

- [Attention](attention.md) — 30-second attention window, any-command dispatch, spoken replies
