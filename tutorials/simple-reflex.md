---
name: Simple Reflex
description: Teach Robot PU reflexes — one rule per event, so the robot reacts instantly to what it sees and hears.
---

# Simple Reflex

A **reflex** is the simplest kind of robot behaviour: *when something happens, do something — immediately, no thinking, no memory.* Each rule is just **event → action**:

| When this happens... | the robot does this |
|---|---|
| it sees a face | greets you |
| it sees a ball | kicks it |
| it hears the wake word | lights its eyes |
| it hears "jump" | jumps |
| it hears "stop" | rests |

This tutorial shows how every reflex is the same two pieces of code: an `on ...` event block, and a `start ... action` inside it.

## What you need

- BBC micro:bit V2
- Robot PU, battery on, on a flat safe surface
- CogniCap smart hat, snapped on and connected to the I2C hub
- The `pxt-robotpu-cap` extension loaded (see [Hello, CogniCap](hello-cognicap.md) step 1)

## The program

```typescript
robotPuCap.startCogniCap()

// Reflex 1: see a face -> greet
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    robotPuPro.start(robotPuPro.Action.Greet, 1)
})

// Reflex 2: see a ball -> kick
robotPuCap.onObjectDetected(robotPuCap.CapObject.Ball, function () {
    robotPuPro.start(robotPuPro.Action.Kick, 1)
})

// Reflex 3: hear the wake word -> flash the eyes
robotPuCap.onWakeWord(function () {
    robotPuPro.leftEyeBright(0.3)
    robotPuPro.rightEyeBright(0.3)
})

// Reflex 4: hear "jump" -> jump once
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Jump, function () {
    robotPuPro.start(robotPuPro.Action.Jump, 1)
})

// Reflex 5: hear "stop" -> rest forever
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    robotPuPro.start(robotPuPro.Action.Rest, 0)
})
```

## How it works

1. `start CogniCap` powers the camera and microphone and starts delivering packets. All detection services turn on by default.
2. `on %object detected` fires every time the camera reports that object — the handler runs the action once per packet, so the reflex triggers again while the object stays in view.
3. `on wake word` fires when the microphone hears the wake word — before any command.
4. `on voice command %action` fires for one specific word. Inside, `start %action for %steps steps` runs the move: `1` step = do it once, `0` = forever.
5. Reflexes are independent — you can add or delete any of them and the others keep working.

## Try it

1. Flash the program and wait for the camera to boot.
2. Show your face → **the robot greets**.
3. Roll a ball in front → **the robot kicks**.
4. Say the wake word → **the eyes flash**.
5. Say **"jump"** → **it jumps**. Say **"stop"** → **it rests**.

## Add your own reflex

Every new reflex is the same pattern — pick an event, then an action:

```typescript
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Dance, function () {
    robotPuPro.start(robotPuPro.Action.Dance, 0)
})
```

Ideas: `dance` → `Action.Dance`, `sing` → `Action.Sing`, `sit` → `Action.Sit`, `explore` → `Action.Explore`. See the full word list in [Voice Command](voice-command.md).

## One handler, many rules

`on any voice command` catches *every* word at once — use `last voice command` inside to build a whole rule table in one block:

```typescript
robotPuCap.onVoiceCommand(function () {
    let cmd = robotPuCap.lastVoiceCommand()
    if (cmd == robotPuCap.VoiceAction.Jump) {
        robotPuPro.start(robotPuPro.Action.Jump, 1)
    } else if (cmd == robotPuCap.VoiceAction.Dance) {
        robotPuPro.start(robotPuPro.Action.Dance, 0)
    } else if (cmd == robotPuCap.VoiceAction.Stop) {
        robotPuPro.start(robotPuPro.Action.Rest, 0)
    }
})
```

> Note: a word with its own `on voice command %action` block goes there instead — `on any voice command` only handles the leftovers.

## Troubleshooting

- **Nothing happens**: open the serial console — `cognicap: no i2c packets yet` means the hat is not connected or powered.
- **The same reflex fires over and over**: that is normal — detection packets keep arriving while the object is visible. To react only once, set a flag: `let done = false` then `if (!done) { done = true; ... }` inside the handler.
- **Voice words are ignored**: say the wake word first — the command window only stays open a few seconds.

## What's next

- [I2C Event Handling](i2c-event-handlling.md) — all the event blocks explained
- [Object Tracking](object-tracking.md) — make the head follow the face, not just react to it
- [Attention](attention.md) — chain reflexes into "say my name, then command me"
