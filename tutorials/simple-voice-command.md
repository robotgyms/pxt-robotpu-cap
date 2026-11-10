---
name: Simple Voice Command
description: Easy version — one `on voice command` block per word.
---

# Simple Voice Command

Voice control is just reflexes: one `on voice command %action` block per word, with a `start %action` inside. No tables, no dispatch — each word gets its own hat block.

## What you need

- micro:bit V2 + Robot PU + CogniCap with microphone

## The program

```typescript
robotPuCap.startCogniCap()

robotPuCap.onWakeWord(function () {
    robotPuPro.leftEyeBright(0.3)
    robotPuPro.rightEyeBright(0.3)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Walk, function () {
    robotPuPro.start(robotPuPro.Action.Walk, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Dance, function () {
    robotPuPro.start(robotPuPro.Action.Dance, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    robotPuPro.start(robotPuPro.Action.Rest, 0)
})
```

## How it works

1. `start CogniCap` enables the voice pipeline (voice commands are on by default).
2. The wake word opens a ~10 s command window — `on wake word` flashes the eyes so you know it's listening.
3. Each `on voice command %action` runs when its word is heard inside the window. `0` steps = run forever, so `walk`/`dance` continue until "stop" fires `rest`.

## Try it

1. Say the wake word → eyes flash.
2. Say **"walk"** → it walks. **"dance"** → it dances. **"stop"** → it rests.

## Add a word

Copy one block, change the dropdowns:

```typescript
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Explore, function () {
    robotPuPro.start(robotPuPro.Action.Explore, 0)
})
```

All ~30 words are in the `VoiceAction` dropdown — see [Voice Command](voice-command.md) for the full table.

## What's next

- [Voice Command](voice-command.md) — many words handled with one catch-all handler + a token table
- [Attention](attention.md) — require "p u" before commands count
