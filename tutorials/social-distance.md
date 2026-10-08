---
name: Social Distance
description: Follow a person's face while keeping a polite distance — step closer when they are far away and back up when they get too close.
---

# Social Distance

Robot PU watches for a face and follows it, but politely keeps about **one metre** of personal space. Come closer and it backs away — "social distance please!" Stand farther off and it walks toward you — "wait for me!" Lose sight of you and it scans the room until it finds you again — "where are you?"

## What you need

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat with a camera
- CogniCap firmware with face detection enabled

## Goal

- Track a face with the head (`object yaw` / `object pitch` → `servo step`).
- Keep a social bubble: `object y (mm)` drives `walk` — forward past `SOCIAL_DIST`, backward inside it.
- Turn the body toward the face with a smoothed `yaw` → `walkTurn` mapping.
- Follow through briefly when the face drops out of view, then stop and scan with `search for face`.
- Give the robot a voice: greet on first sight, ask for space when you crowd it, call out when you disappear.

## How it works

This tutorial modernises an older raw-I2C program. The extension now handles all the plumbing by itself:

- `start CogniCap` replaces the manual mux write, the 18-byte packet polling loop, and the camera-reboot service loop — the extension re-sends the service enables every 30 s on its own.
- `enable detections [face]` replaces the `setService` calls — only the face detector runs, saving ESP32-S3 processing power.
- `object detected`, `object yaw`, `object pitch`, and `object y` replace the hand-rolled `i8` / `i16` / `u16` packet parsing.
- `search for face` replaces the custom `SEARCH_PATTERN` scan function.
- `robotpuVoice.say` replaces the old `talk` calls.

In the main loop:

1. When a face is visible, `objectDetected(face)` is true. The robot dims its eyes, reads `yaw`, `pitch`, and `y_mm` (forward distance in millimetres), and smooths the angles with `0.5 * old + 0.5 * new`.
2. `walkSpeed = (faceDist - SOCIAL_DIST) * speedGain`, clamped to `−6..6`. The sign does the social distancing: **positive** when you are farther than the bubble (walks toward you), **negative** when you step inside it (backs away).
3. `walkTurn` blends `smoothYaw * turnGain` with the previous turn — the body rotates toward the face. `smoothYaw -= walkTurn` compensates the head target so the gaze stays on you while the body turns.
4. `tooClose` is set with a little hysteresis: on when you are inside `0.8 × SOCIAL_DIST`, off again past `1.1 × SOCIAL_DIST` — so the complaints don't flicker at the boundary.
5. If the face drops out for less than `lostTimeout` ms, everything decays — the robot glides to a stop while still looking where you were.
6. After `lostTimeout`, the robot stops walking, brightens its eyes, and runs `search for face` — the head sweeps a scan pattern until a face reappears.
7. A second `forever` loop gives the robot its manners, saying one line every few seconds based on state: greeting on first sight, "social distance please!" when `tooClose`, "wait for me!" while catching up, "where are you?" while searching.

## Blocks used

- `start CogniCap`
- `enable detections`
- `object detected`
- `object yaw`
- `object pitch`
- `object y`
- `search for face`
- `start %action for %steps steps`
- `servo step`
- `servo targets`
- `walk`
- `stand`
- `set servo trim`
- `left eye bright`
- `right eye bright`
- `blink`
- `robotpuVoice set voice`
- `robotpuVoice say`

## Example

```typescript
const SOCIAL_DIST = 1000    // the personal-space bubble, in mm
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
let lostTimeout = 6000
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
let objectFound = 0
let tooClose = false

robotPuCap.startCogniCap()
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)
// set servo trim to help robot balancing
robotPuPro.setServoTrim(0, -5)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)

// main loop: keep the face centred and hold the social bubble
basic.forever(function () {
    now = input.runningTime()
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        followLastTime = now
        if (objectFound == 0) {
            objectFound = 1
            robotpuVoice.say("Ahaa! I see you!")
        }
        // soft light of eyes, and look at you
        robotPuPro.leftEyeBright(0.01)
        robotPuPro.rightEyeBright(0.01)
        // get the angle and distance to the face
        yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
        pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
        faceDist = robotPuCap.objectY(robotPuCap.CapObject.Face)
        // Smooth the measured angles
        smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
        smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
        // the social bubble: positive speed walks closer, negative backs away
        walkSpeed = Math.max(-6, Math.min(6, (faceDist - SOCIAL_DIST) * speedGain))
        walkTurn = (walkTurn + Math.max(-1, Math.min(1, smoothYaw * turnGain))) * 0.5
        robotPuPro.walk(walkSpeed, walkTurn)
        // compensate the head yaw target so the gaze stays on the face
        smoothYaw -= walkTurn
        // hysteresis for the "too close" complaint
        if (faceDist < SOCIAL_DIST * 0.8) {
            tooClose = true
        } else if (faceDist > SOCIAL_DIST * 1.1) {
            tooClose = false
        }
    } else if (now - followLastTime < lostTimeout) {
        // follow through briefly — glide to a stop while still looking
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        walkSpeed *= decay
        walkTurn *= turnDecay
        robotPuPro.walk(walkSpeed, walkTurn)
        robotPuPro.blink(1)
    } else {
        // face lost for good: stop and scan the room
        walkSpeed = 0
        walkTurn = 0
        robotPuPro.stand()
        robotPuCap.searchForObject(robotPuCap.CapObject.Face)
        // eyes bright while searching
        robotPuPro.blink(5)
        if (objectFound == 1) {
            objectFound = 0
            tooClose = false
        }
    }
    // Move head toward the face
    robotPuPro.start(robotPuPro.Action.API, 0)
    targets = robotPuPro.servoTargets()
    currentYaw = targets[4]
    currentPitch = targets[5]
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    basic.pause(5)
})

// chatter loop: the robot comments on the distance every few seconds
basic.forever(function () {
    if (objectFound == 0) {
        robotpuVoice.say("Where are you?")
    } else if (tooClose) {
        robotpuVoice.say("Social distance please!")
    } else if (walkSpeed > 0.5) {
        robotpuVoice.say("Wait for me!")
    } else {
        robotpuVoice.say("I love you!")
    }
    basic.pause(8000)
})
```

## Tuning

- `SOCIAL_DIST` (1000 mm): the personal-space bubble. Make it bigger for a shy robot, smaller for a cuddly one.
- `speedGain` (0.2): how hard the robot chases or retreats. `(faceDist - 1000) * 0.2` clamps at `±6`, so beyond ~1030 mm error it is already at full speed — lower the gain for a gentler approach.
- `turnGain` (−0.2): body turn strength. The negative sign turns toward the face; raise the magnitude to rotate faster, lower it to reduce wobble.
- `decay` (0.7) / `turnDecay` (0.9): the follow-through fade when the face blinks out of view. Speed drops faster than turn so the robot stops sliding but keeps facing the last direction.
- `lostTimeout` (6000 ms): how long the robot coasts before it stops and scans. Raise it if your camera drops faces often.
- The `0.8` / `1.1` hysteresis band on `tooClose`: widen it if the robot flips between compliments and complaints at the bubble edge.
- The chatter loop pauses `8000` ms between lines — raise it for a quieter robot, or replace the strings with whatever suits its manners.
- `trackGain` (0.2) / `trackSpeed` (0.1): head-tracking gains, same as in [Object Tracking](object-tracking.md).
- If the robot walks *away* from a distant face, check the sign of `object y` for your build with `serial.writeLine("d=" + faceDist)`.

## What to try next

- Wave or step back faster when someone lunges: if `faceDist` drops by more than ~300 mm in a second, play a `Scream` or `Duck` action.
- Add the `p u` / `pew` attention prefix from [Attention](attention.md) so the robot only follows while it is paying attention.
- Combine with the `moving` flag from [Voice and Eye](voice-eye.md) so a `stop` voice command freezes the bubble.
- Track a different `CapObject` — `Ball` makes a social-distance soccer guard.
