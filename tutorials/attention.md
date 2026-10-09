---
name: Attention
description: React to the "p u" / "pew" attention prefix by standing up and tracking the speaker's face, then turning any real command into an action.
---

# Attention

Say the robot's name — `p u` (or `pew`) — and Robot PU snaps to attention: it stands up, its eyes light up, it says "yes?", and its head locks onto your face. If it can't see you, it keeps its head up and its eyes bright while it looks.

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
3. **Command** — the next phrase inside the window is accepted, forwarded as its normal action token (`1`–`34`), and the window closes. Phrases heard without the prefix are ignored by the firmware. Tokens `32`–`34` (`record`, `video`, `photo`) also trigger the capture on the cap itself — the token reaches the micro:bit so your code can react too.

Token `30` has its own `VoiceAction` member — `attention` — so a single `on any voice command` handler can catch it by checking `last voice command`. (Alternatives: a dedicated `on voice command attention` handler, or raw `on I2C message type 16` + `last action token`.)

## Goal

- Catch every voice token with one `on any voice command` handler and dispatch on `last voice command`.
- Play an alert reaction: stand up, bright eyes, and a "yes?" reply.
- Track the speaker's face with the head while attention lasts.
- When no face is visible, hold the head steady and brighten the eyes while it keeps looking.
- End attention the moment a real command arrives, so the command's action owns the servos.

## How the code works

1. `start CogniCap`, `enable voice commands`, and `enable detections [face]` start the pipeline.
2. `on wake word` flashes the eyes — the robot perks up before you even say its name.
3. `VoiceAction` tokens are **not** the same numbers as `robotPuPro.Action` values — voice `walk` is `14` but `Action.Walk` is `10`, voice `stop` is `4` but `Action.Kick` is `4`. So three dictionaries — `voiceAction`, `voiceSteps`, `voicePhrase` — translate each command token into the action to run, how many steps it takes, and the phrase to say. Never feed `last voice command` straight into `start()`.
4. `on any voice command` fires for every voice token (it is skipped only for tokens that have a dedicated `on voice command %action` handler, and this example registers none). When `last voice command` is `attention` (token `30`), it sets `attentive = true` and plays the alert — including `start stand` so the robot straightens up to look at you, and `say` reading the reply from `voicePhrase[attention]`. Attention lasts until a real command arrives — the firmware's 10 s window closes on its own, so the next command needs a fresh wake + `p u` anyway.
5. Every handler call first resets the control offsets to zero — leftover lean/turn offsets from a previous action can tip the robot over when the next one starts. `EVT_VOICE` packets are delivered on every poll and are *not* deduplicated, so a repeated token simply re-runs its action and phrase — harmless for continuous actions like walking.
6. Any other token sets `attentive = false` — attention turns into action — then the dictionaries decide which action runs and what the robot says. Tokens with a phrase but no action (`record`, `video`, `photo` — the cap does the recording itself) just get the spoken reply, and tokens with neither entry are ignored, so an unmapped phrase like `sing` can't confuse the action state.
7. In `forever`, while `attentive`, the robot runs in `API` action mode (which does nothing, so no behaviour fights for the servos):
   - **Face found**: `object yaw` / `object pitch` are smoothed and `servo step` moves the head toward the face — same as [Object Tracking](object-tracking.md).
   - **No face**: the smoothed angles decay back to centre and the eyes brighten the longer the face is gone — the robot keeps looking without wandering off.
8. Bonus: every `p u` packet also counts toward the built-in attention counters, so `attention state` bit 1 (voice) lights up and `attention reward` grows — see [Personality with Q-Learning](personality-qtable.md).

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `enable detections`
- `on wake word`
- `on any voice command` + `last voice command`
- `on voice command %action` (alternative)
- `last action token` (raw alternative)
- `object detected`
- `object yaw`
- `object pitch`
- `set control offsets`
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
    robotPuPro.leftEyeBright(0.1)
    robotPuPro.rightEyeBright(0.1)
})
// VoiceAction tokens are NOT the same numbers as robotPuPro.Action
// (voice "walk" is 14, Action.Walk is 10), so dictionaries translate
// each voice token into the action, step count and phrase to use.
// Add a command by adding one row to each dictionary.
let voiceAction: number[] = []
let voiceSteps: number[] = []
let voicePhrase: string[] = []
// the attention prefix gets a phrase too — say() reads it from the dictionary
voicePhrase[robotPuCap.VoiceAction.Attention] = "Yes?"
voiceAction[robotPuCap.VoiceAction.Walk] = robotPuPro.Action.Walk
voicePhrase[robotPuCap.VoiceAction.Walk] = "Ok! I am going."
voiceAction[robotPuCap.VoiceAction.Back] = robotPuPro.Action.WalkBackward
voicePhrase[robotPuCap.VoiceAction.Back] = "Watch my six!"
voiceAction[robotPuCap.VoiceAction.Left] = robotPuPro.Action.TurnLeft
voicePhrase[robotPuCap.VoiceAction.Left] = "Turn Left!"
voiceAction[robotPuCap.VoiceAction.Right] = robotPuPro.Action.TurnRight
voicePhrase[robotPuCap.VoiceAction.Right] = "Turn Right!"
voiceAction[robotPuCap.VoiceAction.Dance] = robotPuPro.Action.Dance
voicePhrase[robotPuCap.VoiceAction.Dance] = "Dance is fun"
voiceAction[robotPuCap.VoiceAction.Jump] = robotPuPro.Action.Jump
voicePhrase[robotPuCap.VoiceAction.Jump] = "I could reach the moon!"
voiceAction[robotPuCap.VoiceAction.Kick] = robotPuPro.Action.Kick
voiceSteps[robotPuCap.VoiceAction.Kick] = 1
voicePhrase[robotPuCap.VoiceAction.Kick] = "Kick it hard!"
voiceAction[robotPuCap.VoiceAction.Sit] = robotPuPro.Action.Sit
voicePhrase[robotPuCap.VoiceAction.Sit] = "I have no chair to sit."
voiceAction[robotPuCap.VoiceAction.Stand] = robotPuPro.Action.Stand
voicePhrase[robotPuCap.VoiceAction.Stand] = "I am taller now!"
voiceAction[robotPuCap.VoiceAction.Stop] = robotPuPro.Action.Rest
voicePhrase[robotPuCap.VoiceAction.Stop] = "I am so tired!"
// record, video and photo run on the cap itself — phrase only, no action
voicePhrase[robotPuCap.VoiceAction.Record] = "Recording!"
voicePhrase[robotPuCap.VoiceAction.Video] = "Rolling!"
voicePhrase[robotPuCap.VoiceAction.Photo] = "Cheese!"

let attentive = false
let cmd = 0
// one handler catches every voice token — "p u" / "pew" arrives as token 30
robotPuCap.onVoiceCommand(function () {
    cmd = robotPuCap.lastVoiceCommand()
    // reset control vector to 0 to avoid falling
    robotPuPro.setControlOffsets([0, 1, 2, 3, 4, 5], [0, 0, 0, 0, 0, 0])
    if (cmd == robotPuCap.VoiceAction.Attention) {
        attentive = true
        robotPuPro.leftEyeBright(0.05)
        robotPuPro.rightEyeBright(0.05)
        // stand up to pay attention
        robotPuPro.start(robotPuPro.Action.Stand, 0)
        robotpuVoice.say(voicePhrase[cmd])
    } else {
        // a real command after "p u" ends attention and owns the servos
        attentive = false
        if (voiceAction[cmd] !== undefined) {
            robotPuPro.start(voiceAction[cmd], voiceSteps[cmd] || 0)
        }
        // capture tokens have a phrase but no action — just reply
        if (voicePhrase[cmd] !== undefined) {
            robotpuVoice.say(voicePhrase[cmd])
        }
    }
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
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.10
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
// main event loop
basic.forever(function () {
    if (attentive) {
        now = input.runningTime()
        // API mode does nothing, so no behaviour fights for the servos
        robotPuPro.start(robotPuPro.Action.API, 0)
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
            // eyes so bright to look for you
            robotPuPro.blink(3)
        }
        // Move head toward the object
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(1, Math.abs(smoothYaw * trackSpeed)))
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(1, Math.abs(smoothPitch * trackSpeed)))
        basic.pause(10)
    } else {
        basic.pause(500)
    }
})

```

## Alternative: catch the token another way

Instead of one `on any voice command` handler plus dictionaries, you can register a dedicated `on voice command %action` block per token — more blocks, but each command gets its own hat:

```typescript
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Attention, function () {
    attentive = true
    // same attention logic as above
})
```

Note that `on any voice command` is a *fallback*: it fires only for tokens with no dedicated `on voice command %action` handler. If you register `attention` this way, token `30` bypasses the shared handler and reaches only the dedicated block.

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

- `trackGain` (0.2) and `trackSpeed` (0.1): same head-tracking gains as in [Object Tracking](object-tracking.md) — raise `trackGain` for a snappier head, lower it to stop oscillation.
- `decay` (0.7): how fast the smoothed angles fade during the no-face follow-through — raise toward `0.9` to keep looking in the last direction longer.
- `lostTimeout` (1000 ms): how long the robot follows through and then holds before giving the eyes their brightest "looking for you" blink.
- Repeated voice packets re-fire the handler. If the robot repeats its phrase too often while a token is streaming in, add a cooldown like `if (input.runningTime() - lastCmdTime > 3000)` around the `else` branch.
- The control-offset reset runs on every voice token — if you add a handler that intentionally sets offsets (e.g. a lean), reset them again before the next command or the robot may fall.
- Add a new voice command by adding one row to `voiceAction`, `voiceSteps` (optional — defaults to `0` = run forever), and `voicePhrase` — the shared `else` branch already clears `attentive`. If you register a dedicated `on voice command %action` handler for a token instead, set `attentive = false` there too, or the tracking loop will keep fighting the action for the head servos.

## What to try next

- Make the robot come to you: swap the head tracking in `forever` for the follow loop from [Social Distance](social-distance.md) — `walk((faceDist - COMFORT_DIST) * speedGain, walkTurn)` — so attention makes it approach instead of just watch.
- Greet instead of just standing and saying "yes?": run `robotPuPro.start(robotPuPro.Action.Greet, 1)` on token `30`, then start tracking once `is greet done` fires.
- Feed the attention into learning: each `p u` and face packet already increments the attention counters, so call `attention action` in a slow loop and let the Q-table learn which of its actions earns the most `p u`s — see [Personality with Q-Learning](personality-qtable.md).
- Combine with the `moving` flag pattern from [Voice and Eye](voice-eye.md) so every locomotion command suspends attention cleanly.
