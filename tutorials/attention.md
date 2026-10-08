---
name: Attention
description: React to the "p u" / "pew" attention prefix by standing up, tracking the speaker's face, and walking to face them at a comfortable distance.
---

# Attention

Say the robot's name — `p u` (or `pew`) — and Robot PU snaps to attention: it stands up, its eyes light up, it says "yes?", and its head locks onto your face. If your face drifts too far to one side it turns its body toward you, and it steps closer or backs away until your face is a comfortable size in the camera — then it just stands there, watching you.

Keep saying `p u` while you move around and the robot will keep re-arming its attention, turning and walking to follow your face.

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
- When the head yaw error grows too large (`|smoothYaw| > YAW_LIMIT`), turn the body toward the face so the head can re-centre.
- Walk forward when the face box is too small (person too far) and backward when too big (person too close); `stand` and hold the pose when the size is in the sweet spot.
- End attention the moment a real command arrives, so the command's action owns the servos.
- Relax back to rest when the window expires.

## How the code works

1. `start CogniCap`, `enable voice commands`, and `enable detections [face]` start the pipeline.
2. `on wake word` flashes the eyes — the robot perks up before you even say its name.
3. `on voice command attention` fires on token `30`. The handler sets `attentive = true`, pushes `attentiveUntil` 12 s into the future (a little longer than the 10 s command window), and plays the alert — including `robotPuPro.stand()` so the robot straightens up to look at you. Saying `p u` again re-arms the timer, matching the firmware.
4. `EVT_VOICE` packets are delivered on every poll — they are *not* deduplicated — so the same `p u` can fire the handler many times. A `lastAlert` cooldown makes the eyes-and-"yes?" reaction play only once every 3 s while the timer still re-arms.
5. In `forever`, while `attentive` and inside the window, the robot runs in `API` action mode (which does nothing, so no behaviour fights for the servos):
   - **Head**: `object yaw` / `object pitch` are smoothed and `servo step` moves the head toward the face — same as [Object Tracking](object-tracking.md).
   - **Turn**: when `|smoothYaw|` exceeds `YAW_LIMIT` the head alone can't keep up, so `walk(walkSpd, turnCmd)` rotates the body toward the face (`turnCmd = -smoothYaw * turnGain`, same sign convention as [Object Following](object-following.md)).
   - **Distance**: `object height` gives the face box height in pixels. Below `FACE_MIN` the person is too far → `walkSpd` is positive; above `FACE_MAX` too close → negative. Inside the deadband `walkSpd` stays `0`.
   - **Stand**: when both `turnCmd` and `walkSpd` are `0`, `robotPuPro.stand()` holds the robot still, standing and watching — the "paying attention" pose.
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
- `object height`
- `start %action for %steps steps`
- `servo targets`
- `servo step`
- `walk`
- `stand`
- `left eye bright`
- `right eye bright`
- `blink`
- `robotpuVoice set voice`
- `robotpuVoice say`

## Example

```typescript
const ATTENTION_MS = 12000   // stay alert a little longer than the 10 s command window
const YAW_LIMIT = 25         // head yaw error (deg) before the body turns
const FACE_MIN = 60          // face box height (px): below = too far, walk closer
const FACE_MAX = 140         // face box height (px): above = too close, back up
let attentive = false
let tracking = false         // true while the head is under API control
let attentiveUntil = 0
let lastAlert = 0            // rate-limit the alert reaction
// face tracking state (same as object-tracking.md)
let currentPitch = 0
let currentYaw = 0
let targets: number[] = []
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let faceH = 0
let walkSpd = 0
let turnCmd = 0
let followLastTime = 0
let now = 0
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.1
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
// body assist gains
let turnGain = 0.04
let walkSpeed = 2

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

// "p u" / "pew" arrives as token 30 — the attention prefix
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Attention, function () {
    attentive = true
    attentiveUntil = input.runningTime() + ATTENTION_MS
    // the token may repeat in the packet stream — alert once per 3 s
    if (input.runningTime() - lastAlert > 3000) {
        lastAlert = input.runningTime()
        basic.showIcon(IconNames.Happy)
        robotPuPro.leftEyeBright(0.5)
        robotPuPro.rightEyeBright(0.5)
        // stand up to pay attention
        robotPuPro.start(robotPuPro.Action.Stand, 0)
        robotpuVoice.say("Yes?")
    }
})

// a real command after "p u" ends attention and runs its action
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Walk, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Walk, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Dance, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Dance, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Kick, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Kick, 1)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Rest, 0)
    robotpuVoice.stopSpeaking()
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Sit, function () {
    attentive = false
    robotPuPro.start(robotPuPro.Action.Sit, 0)
})

// main loop: while the attention window is open, track the face with the
// head, turn the body when the head can't keep up, and step to a
// comfortable distance — stand and hold the pose when centred and in range
basic.forever(function () {
    now = input.runningTime()
    if (attentive && now < attentiveUntil) {
        if (!tracking) {
            // take over the servos once; API mode lets us drive them directly
            tracking = true
            smoothYaw = 0
            smoothPitch = 0
            robotPuPro.start(robotPuPro.Action.API, 0)
        }
        // Track the face if it is visible
        if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
            followLastTime = now
            // soft light of eyes, and look at you
            robotPuPro.leftEyeBright(0.05)
            robotPuPro.rightEyeBright(0.05)
            // get the angle to the face
            yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
            pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
            faceH = robotPuCap.objectHeight(robotPuCap.CapObject.Face)
            // Smooth the measured angles
            smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
            smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
            // body assist 1: if the head yaw error is too big, turn the body
            // toward the face (negative turn gain, same as followObject)
            turnCmd = 0
            if (Math.abs(smoothYaw) > YAW_LIMIT) {
                turnCmd = Math.max(-1, Math.min(1, -smoothYaw * turnGain))
            }
            // body assist 2: keep the face a comfortable size in the camera —
            // too small means too far away, too big means too close
            walkSpd = 0
            if (faceH > 0 && faceH < FACE_MIN) {
                walkSpd = walkSpeed
            } else if (faceH > FACE_MAX) {
                walkSpd = -walkSpeed
            }
            // move or hold the "paying attention" stand pose
            if (walkSpd != 0 || turnCmd != 0) {
                robotPuPro.walk(walkSpd, turnCmd)
            } else {
                robotPuPro.stand()
            }
        } else {
            // no face: decay the lock and search with brighter eyes
            smoothYaw = smoothYaw * 0.7
            smoothPitch = smoothPitch * 0.7
            robotPuPro.blink(2)
            robotPuPro.stand()
        }
        // Read the current head position and add the offset
        targets = robotPuPro.servoTargets()
        currentYaw = targets[4]
        currentPitch = targets[5]
        // Move head toward the face
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    } else {
        if (tracking || (attentive && now >= attentiveUntil)) {
            // attention ended: a command took over, or the window expired
            tracking = false
            if (attentive) {
                // timed out with no command — relax
                robotPuPro.leftEyeBright(0.01)
                robotPuPro.rightEyeBright(0.01)
                robotPuPro.start(robotPuPro.Action.Rest, 0)
                basic.showIcon(IconNames.Asleep)
            }
        }
        attentive = false
    }
    basic.pause(5)
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

- `ATTENTION_MS` (12000): how long the robot keeps tracking after `p u`. The firmware's command window is 10 s; staying alert slightly longer means the eyes are still on you when your command arrives. Saying `p u` again re-arms it — that is what makes "keep saying p u" produce continuous following.
- `lastAlert` cooldown (3000 ms): the same token is delivered on every I2C poll, so without a cooldown the robot would say "yes?" on a loop. Lower it for a chattier alert, raise it to speak once per window.
- `YAW_LIMIT` (25°): the head-yaw deadband. Below it only the head moves; above it the body turns. Lower it and the robot turns sooner (busier feet, steadier head); raise it for quieter feet.
- `turnGain` (0.04): proportional turn command once past the deadband (`turnCmd = -smoothYaw * turnGain`, clamped to −1..1). The sign is the same convention as `followObject` — negative gain turns the body toward a positive yaw. Increase for sharper turns; too high oscillates.
- `FACE_MIN` / `FACE_MAX` (60 / 140 px): the face-height deadband. Calibrate these for your camera — add `serial.writeLine("h=" + faceH)` inside the face branch, watch the numbers at your preferred distance, and set the band around them.
- `walkSpeed` (2): fixed forward/back step speed, clamped by `walk` to −6..6. Keep it small — a face is close-range work.
- `trackGain` (0.2) and `trackSpeed` (0.1): same head-tracking gains as in [Object Tracking](object-tracking.md).
- Add `attentive = false` to any new `on voice command %action` handler you register, or the tracking loop will keep fighting the action for the servos until the timer expires.
- If the robot backs up instead of approaching (or vice versa), your camera may report size differently — check `faceH` over serial. You can also switch the distance test to `object y (mm)` like `followObject` does.

## What to try next

- Greet instead of just standing and saying "yes?": run `robotPuPro.start(robotPuPro.Action.Greet, 1)` on token `30`, then start tracking once `is greet done` fires.
- Use `object y (mm)` instead of `object height` for the distance band if you prefer real millimetres — the follow logic in [Object Following](object-following.md) works the same way.
- Smooth the walk: replace the fixed `walkSpeed` with a proportional step like `Math.min(4, (FACE_MID - faceH) * 0.05)` so the robot creeps the last few centimetres instead of toggling.
- Feed the attention into learning: each `p u` and face packet already increments the attention counters, so call `attention action` in a slow loop and let the Q-table learn which of its actions earns the most `p u`s — see [Personality with Q-Learning](personality-qtable.md).
- Combine with the `moving` flag pattern from [Voice and Eye](voice-eye.md) so every locomotion command suspends attention cleanly.
