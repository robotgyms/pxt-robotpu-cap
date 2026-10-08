---
name: Attention
description: React to the "p u" / "pew" attention prefix by standing up, tracking the speaker's face, and walking to keep a comfortable distance.
---

# Attention

Say the robot's name — `p u` (or `pew`) — and Robot PU snaps to attention: it stands up, its eyes light up, it says "yes?", and its head locks onto your face. Then it turns and steps toward you — or backs away if you are too close — until you are at a comfortable distance, and just stands there, watching you.

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
- Follow the face with the body, the same way [Social Distance](social-distance.md) does: `object y` (mm) drives forward/back walking, `yaw` drives the turn, and `smoothYaw -= walkTurn` keeps the gaze steady while the body rotates.
- Glide to a stop if the face drops out briefly, then stand and scan with `search for face`.
- End attention the moment a real command arrives, so the command's action owns the servos.
- Relax back to rest when the window expires.

## How the code works

1. `start CogniCap`, `enable voice commands`, and `enable detections [face]` start the pipeline.
2. `on wake word` flashes the eyes — the robot perks up before you even say its name.
3. `on voice command attention` fires on token `30`. The handler sets `attentive = true`, pushes `attentiveUntil` 12 s into the future (a little longer than the 10 s command window), and plays the alert — including `start stand` so the robot straightens up to look at you. Saying `p u` again re-arms the timer, matching the firmware.
4. `EVT_VOICE` packets are delivered on every poll — they are *not* deduplicated — so the same `p u` can fire the handler many times. A `lastAlert` cooldown makes the eyes-and-"yes?" reaction play only once every 3 s while the timer still re-arms.
5. In `forever`, while `attentive` and inside the window, the robot runs in `API` action mode (which does nothing, so no behaviour fights for the servos) and follows the face like [Social Distance](social-distance.md):
   - **Head**: `object yaw` / `object pitch` are smoothed and `servo step` moves the head toward the face — same as [Object Tracking](object-tracking.md).
   - **Distance**: `walkSpeed = (faceDist - COMFORT_DIST) * speedGain`, clamped to `−6..6`. Positive walks closer when you are far, negative backs up when you crowd it — the robot settles where `faceDist ≈ COMFORT_DIST`.
   - **Turn**: `walkTurn` blends `smoothYaw * turnGain` with the previous turn (low-pass filter). The negative gain turns the body toward the face, and `smoothYaw -= walkTurn` compensates the head target so the eyes stay locked on you while the body rotates.
6. If the face drops out for less than `lostTimeout` ms, the speeds and angles decay — the robot glides to a stop still looking where you were. Past that, it stops walking, stands, and runs `search for face` to scan for you.
7. Every `on voice command %action` handler sets `attentive = false` before starting its action — attention turns into action, and the command owns the servos again.
8. When the window expires with no command, the robot dims its eyes and returns to `Rest`.
9. Bonus: every `p u` packet also counts toward the built-in attention counters, so `attention state` bit 1 (voice) lights up and `attention reward` grows — see [Personality with Q-Learning](personality-qtable.md).

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
- `object y`
- `search for face`
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
const COMFORT_DIST = 500     // mm — how close the robot likes to stand from you
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
let faceDist = 0
let followLastTime = 0
let now = 0
let lostTimeout = 2000       // shorter than social-distance — attention is brief
// speed decays fast, turn decays slower — it glides to a stop facing you
let decay = 0.7
let turnDecay = 0.9
let speedGain = 0.2
let turnGain = -0.2
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.1
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
let walkSpeed = 0
let walkTurn = 0

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
// head and follow it with the body — settle at a comfortable distance
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
            // get the angle and distance to the face
            yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
            pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
            faceDist = robotPuCap.objectY(robotPuCap.CapObject.Face)
            // Smooth the measured angles
            smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
            smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
            // follow like social-distance.md: distance drives forward/back,
            // yaw drives the turn — settle where faceDist ~= COMFORT_DIST
            walkSpeed = Math.max(-6, Math.min(6, (faceDist - COMFORT_DIST) * speedGain))
            walkTurn = (walkTurn + Math.max(-1, Math.min(1, smoothYaw * turnGain))) * 0.5
            robotPuPro.walk(walkSpeed, walkTurn)
            // compensate the head yaw target so the gaze stays on the face
            smoothYaw -= walkTurn
        } else if (now - followLastTime < lostTimeout) {
            // follow through briefly — glide to a stop while still looking
            smoothYaw = smoothYaw * decay
            smoothPitch = smoothPitch * decay
            walkSpeed *= decay
            walkTurn *= turnDecay
            robotPuPro.walk(walkSpeed, walkTurn)
            // eyes brighter
            robotPuPro.blink(1)
        } else {
            // face lost for good while still attentive: stop and scan the room
            walkSpeed = 0
            walkTurn = 0
            robotPuPro.stand()
            robotPuCap.searchForObject(robotPuCap.CapObject.Face)
            // eyes so bright to look for you
            robotPuPro.blink(5)
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

- `ATTENTION_MS` (12000): how long the robot keeps following after `p u`. The firmware's command window is 10 s; staying alert slightly longer means the eyes are still on you when your command arrives. Saying `p u` again re-arms it — that is what makes "keep saying p u" produce continuous following.
- `lastAlert` cooldown (3000 ms): the same token is delivered on every I2C poll, so without a cooldown the robot would say "yes?" on a loop. Lower it for a chattier alert, raise it to speak once per window.
- `COMFORT_DIST` (500 mm): the distance the robot settles at. Raise it for a robot that keeps more space, lower it for a closer companion — see [Social Distance](social-distance.md) for a bigger bubble.
- `speedGain` (0.2): multiplies the distance error `(faceDist - COMFORT_DIST)` into walk speed, clamped to `±6`. Lower it for a gentler approach.
- `turnGain` (−0.2): turn strength from yaw error, smoothed by the `0.5` blend. The negative sign turns toward the face; raise the magnitude to rotate faster, lower it to reduce wobble.
- `decay` (0.7) / `turnDecay` (0.9): the follow-through fade when the face drops out — speed falls faster than turn so it stops sliding but keeps facing you.
- `lostTimeout` (2000 ms): how long the robot coasts before it stops and scans. Attention windows are short, so this is tighter than the 6000 ms used in [Social Distance](social-distance.md).
- `trackGain` (0.2) and `trackSpeed` (0.1): same head-tracking gains as in [Object Tracking](object-tracking.md).
- Add `attentive = false` to any new `on voice command %action` handler you register, or the follow loop will keep fighting the action for the servos until the timer expires.
- If the robot backs up instead of approaching (or vice versa), check `object y` for your build with `serial.writeLine("d=" + faceDist)` — or switch the distance measure to `object height` (face box pixels) with a `FACE_MIN`/`FACE_MAX` deadband.

## What to try next

- Greet instead of just standing and saying "yes?": run `robotPuPro.start(robotPuPro.Action.Greet, 1)` on token `30`, then start following once `is greet done` fires.
- Give it manners like [Social Distance](social-distance.md): say "too close!" when `faceDist` drops well under `COMFORT_DIST`.
- Feed the attention into learning: each `p u` and face packet already increments the attention counters, so call `attention action` in a slow loop and let the Q-table learn which of its actions earns the most `p u`s — see [Personality with Q-Learning](personality-qtable.md).
- Combine with the `moving` flag pattern from [Voice and Eye](voice-eye.md) so every locomotion command suspends attention cleanly.
