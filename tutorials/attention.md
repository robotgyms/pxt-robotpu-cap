---
name: Attention
description: React to the "p u" / "pew" attention prefix by standing up and tracking the speaker's face, scanning left and right when no face is visible.
---

# Attention

Say the robot's name — `p u` (or `pew`) — and Robot PU snaps to attention: it stands up, its eyes light up, it says "yes?", and its head locks onto your face. If it can't see you, it slowly sweeps its head left and right until it finds someone.

Keep saying `p u` and the robot stays attentive. Give it a real command — `walk`, `dance`, `sit` — and attention turns into action.

## What you need

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat with a microphone and camera
- CogniCap firmware with **WakeNet** wake-word (or the level-pattern fallback) and **MultiNet** command recognition enabled

## How "p u" works on the CogniCap

The ESP32-S3 gates commands with a two-step attention sequence so ambient speech does not fire robot actions:

1. **Wake** — the wake word (or level-pattern fallback) opens a 10 second command window. A wake event arrives over I2C as an `EVT_WAKE` (`0x11`) packet, which fires `on wake word`.
2. **Prefix** — saying `p u` (or `pew`) inside the window sets `prefix_heard` on the CogniCap and re-arms the window for another 10 seconds. The prefix is forwarded over I2C as an `EVT_VOICE` (`0x10`) packet with **token `30`**. This is the moment your code can play an attention behaviour.
3. **Command** — the next phrase inside the window is accepted, forwarded as its normal action token (`1`–`29`), and the window closes. Phrases heard without the prefix are ignored by the firmware.

Token `30` has its own `VoiceAction` member — `attention` — so `on voice command attention` fires exactly when the prefix is heard. (Alternatives: catch it in `on any voice command` with `last voice command == 30`, or raw with `on I2C message type 16` + `last action token`.)

## Goal

- Catch token `30` with `on voice command attention`.
- Play an alert reaction: stand up, bright eyes, and a "yes?" reply.
- Track the speaker's face with the head for the length of the attention window (~10 s).
- When no face is visible, sweep the head left and right slowly with `search for face`.
- End attention the moment a real command arrives, so the command's action owns the servos.
- Relax back to rest when the window expires.

## How the code works

1. `start CogniCap`, `enable voice commands`, and `enable detections [face]` start the pipeline.
2. `on wake word` flashes the eyes — the robot perks up before you even say its name.
3. `on voice command attention` fires on token `30`. The handler sets `attentive = true`, pushes `attentiveUntil` 12 s into the future (a little longer than the 10 s command window), and plays the alert — including `start stand` so the robot straightens up to look at you. Saying `p u` again re-arms the timer, matching the firmware.
4. `EVT_VOICE` packets are delivered on every poll — they are *not* deduplicated — so the same `p u` can fire the handler many times. A `lastAlert` cooldown makes the eyes-and-"yes?" reaction play only once every 3 s while the timer still re-arms.
5. In `forever`, while `attentive` and inside the window, the robot runs in `API` action mode (which does nothing, so no behaviour fights for the servos):
   - **Stand**: `robotPuPro.stand()` runs every iteration to hold the standing pose — the body never walks.
   - **Face found**: `object yaw` / `object pitch` are smoothed and `servo step` moves the head toward the face — same as [Object Tracking](object-tracking.md).
   - **No face**: the smoothed angles decay and `search for face` sweeps the head through its scan pattern — slowly looking left and right until a face reappears.
6. Every `on voice command %action` handler sets `attentive = false` before starting its action — attention turns into action, and the command owns the servos again.
7. When the window expires with no command, the robot dims its eyes and returns to `Rest`.
8. Bonus: every `p u` packet also counts toward the built-in attention counters, so `attention state` bit 1 (voice) lights up and `attention reward` grows — see [Personality with Q-Learning](personality-qtable.md).

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `enable detections`
- `on wake word`
- `on voice command %action`
- `on any voice command` + `last voice command` (alternative)
- `last action token` (raw alternative)
- `object detected`
- `object yaw`
- `object pitch`
- `search for face`
- `start %action for %steps steps`
- `servo targets`
- `servo step`
- `stand`
- `left eye bright`
- `right eye bright`
- `blink`
- `robotpuVoice set voice`
- `robotpuVoice say`

## Example

```typescript
robotPuPro.setServoTrim(robotPuPro.ServoJoint.LeftFoot, -4)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.RightFoot, -4)
robotPuPro.saveServoTrimCalibration()
robotPuPro.start(robotPuPro.Action.Rest, 0)

robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)

// wake word — eyes flash even before "p u" is heard
robotPuCap.onWakeWord(function () {
    robotPuPro.leftEyeBright(0.3)
    robotPuPro.rightEyeBright(0.3)
    basic.showIcon(IconNames.Surprised)
})
let attentive = false
// "p u" / "pew" arrives as token 30 — the attention prefix
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Attention, function () {
    attentive = true
    // the token may repeat in the packet stream — alert once per 3 s
    robotPuPro.leftEyeBright(0.05)
    robotPuPro.rightEyeBright(0.05)
    // stand up to pay attention
    robotPuPro.start(robotPuPro.Action.Stand, 0)
    robotpuVoice.say("Yes?")
})

// a real command after "p u" ends attention and runs its action
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Walk, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Walk, 0)
    robotpuVoice.say("Ok! I am going.")
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Dance, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Dance, 0)
    robotpuVoice.say("Dance is fun")
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Kick, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Kick, 1)
    robotpuVoice.say("Kick it hard!")
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Rest, 0)
    robotpuVoice.say("I am so tired!")
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Sit, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Sit, 0)
    robotpuVoice.say("I have no chair.")
})

let currentPitch = 0
let currentYaw = 0
let targets: number[] = []
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let detectionInterval = 0
let followLastTime = 0
let now = 0
let lostTimeout = 1000
let decay = 0.7
robotPuCap.startCogniCap()
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.10
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
// main event loop
basic.forever(function () {
    if (attentive) {
        now = input.runningTime()
        // Track the chosen object if it is visible
        if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
            detectionInterval = now - followLastTime
            followLastTime = now
            // soft light of eyes, and look at you
            robotPuPro.leftEyeBright(0.05)
            robotPuPro.rightEyeBright(0.05)
            // get the angle to the object
            yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
            pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
            // Smooth the measured angles
            smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
            smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
            // Read the current head position and add the offset
            targets = robotPuPro.servoTargets()
            currentYaw = targets[4]
            currentPitch = targets[5]
            serial.writeLine("yaw:" + smoothYaw)
            serial.writeLine("pitch:" + smoothPitch)
        } else if (now - followLastTime < Math.min(detectionInterval, lostTimeout)) {
            // follow through
            smoothYaw = smoothYaw * decay
            smoothPitch = smoothPitch * decay
            // eyes brighter
            robotPuPro.blink(1)
        } else if (now - followLastTime < 2 * lostTimeout) {
            smoothYaw = 0
            smoothPitch = 0
            // eyes much brighter
            robotPuPro.blink(2)
        } else {
            robotPuPro.stand()
            // eyes so bright to look for you
            robotPuPro.blink(3)
        }
        // Move head toward the object
        robotPuPro.start(robotPuPro.Action.API, 0)
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(1, Math.abs(smoothYaw * trackSpeed)))
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(1, Math.abs(smoothPitch * trackSpeed)))
        basic.pause(10)
    } else {
        basic.pause(500)
    }
})

```

## Alternative: catch the token another way

`on any voice command` fires for tokens with no dedicated `on voice command %action` handler — if you don't register `attention`, token `30` lands here and you can check `last voice command`:

```typescript
robotPuCap.onVoiceCommand(function () {
    if (robotPuCap.lastVoiceCommand() == 30) {
        // "p u" heard — same attention logic as above
    }
})
```

Or go raw: `on I2C message type 16` (`0x10` = `EVT_VOICE`) fires for **every** voice packet — including tokens that already have a dedicated handler — so filter inside it. `last action token` reads the token byte from the latest packet:

```typescript
robotPuCap.onI2CMessage(16, function () {
    if (robotPuCap.lastActionToken() == 30) {
        // "p u" heard — same attention logic as above
    }
})
```

`latest voice command` returns `"attention"` for token `30`.

## Tuning

- `ATTENTION_MS` (12000): how long the robot keeps tracking after `p u`. The firmware's command window is 10 s; staying alert slightly longer means the eyes are still on you when your command arrives. Saying `p u` again re-arms it — that is what makes "keep saying p u" produce continuous attention.
- `lastAlert` cooldown (3000 ms): the same token is delivered on every I2C poll, so without a cooldown the robot would say "yes?" on a loop. Lower it for a chattier alert, raise it to speak once per window.
- `trackGain` (0.2) and `trackSpeed` (0.1): same head-tracking gains as in [Object Tracking](object-tracking.md) — raise `trackGain` for a snappier head, lower it to stop oscillation.
- The no-face branch decays `smoothYaw`/`smoothPitch` by `0.7` while `search for face` sweeps — raise the decay factor toward `0.9` to keep looking in the last direction longer before the scan takes over.
- `search for face` uses the built-in scan pattern; make the sweep faster by calling it less often (e.g. every other loop) or slower by wrapping it in your own counter.
- Add `attentive = false` to any new `on voice command %action` handler you register, or the tracking loop will keep fighting the action for the head servos until the timer expires.

## What to try next

- Make the robot come to you: swap the `stand()` for the follow loop from [Social Distance](social-distance.md) — `walk((faceDist - COMFORT_DIST) * speedGain, walkTurn)` — so attention makes it approach instead of just watch.
- Greet instead of just standing and saying "yes?": run `robotPuPro.start(robotPuPro.Action.Greet, 1)` on token `30`, then start tracking once `is greet done` fires.
- Feed the attention into learning: each `p u` and face packet already increments the attention counters, so call `attention action` in a slow loop and let the Q-table learn which of its actions earns the most `p u`s — see [Personality with Q-Learning](personality-qtable.md).
- Combine with the `moving` flag pattern from [Voice and Eye](voice-eye.md) so every locomotion command suspends attention cleanly.
