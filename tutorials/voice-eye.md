---
name: Voice and Eye
description: Obey voice commands and track a face with the eyes whenever the robot is not moving.
---

# Voice and Eye

Combine the MultiNet voice commands from the [Voice Command](voice-command.md) tutorial with the face-tracking loop from [Object Tracking](object-tracking.md). The robot listens for commands like `walk`, `dance`, `sing`, and `talk`, and whenever its body is idle — resting, standing, or sitting — the eyes follow your face.

## What you need

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat with a microphone and camera
- CogniCap firmware with **WakeNet** wake-word, **MultiNet** command recognition, and face detection enabled

## Goal

- Map spoken commands to `robotPuPro` actions with `on voice command %action`.
- Track a face with the head servos **only when the robot is not moving**.
- Pause tracking while locomotion or performance actions (`walk`, `walk backward`, `turn left`, `turn right`, `explore`, `dance`, `laugh`, `cry`) own the body.
- Resume tracking automatically when a counted one-shot action (`kick`, `jump`) finishes on its own.
- Pause tracking while a `sing` or `talk` show is running, because `startGroove` drives the head during the show.

## How it works

1. `robotPuCap.startCogniCap()` starts the I2C loop, `enableVoiceCommands(true)` turns on MultiNet, and `enableDetections([face])` turns on face detection.
2. There is no block that asks the robot which action is running, so a `moving` flag tracks it instead. Voice handlers set `moving = true` for actions that own the body and `moving = false` for idle ones (`rest`, `sit`, `stand`).
3. `busyAction` remembers the last action a voice handler started. In the `forever` loop, `is %action done` clears `moving` when a counted action (started with `steps = 1`, like `Kick` or `Jump`) completes by itself. Continuous actions (`steps = 0`) never report done, so `moving` stays `true` until `stop`, `sit`, or `stand` is heard.
4. While `moving` is `false` and `showBusy` is `false`, the loop switches the robot to `API` action mode **once** — the API state does nothing, so the servo targets hold whatever pose the body is in — then runs the same face-tracking code as [Object Tracking](object-tracking.md): read `object yaw` / `object pitch`, smooth them, and `servo step` the head toward the face.
5. While `moving` or `showBusy` is `true`, the tracking block is skipped entirely so the walk gait, dance, or groove keeps full control of the servos, including the head.
6. The eye LEDs give feedback: a soft glow while a face is visible, a brighter blink while searching, and the brightest blink when the face has been lost for a while.

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `enable detections`
- `on voice command %action`
- `start %action for %steps steps`
- `is %action done`
- `object detected`
- `object yaw`
- `object pitch`
- `servo targets`
- `servo step`
- `blink`
- `left eye bright`
- `right eye bright`
- `stand`
- `set servo trim`
- `save servo trims`
- `robotpuVoice set voice`
- `robotpuVoice set volume`
- `robotpuVoice say`
- `robotpuVoice sing note`
- `robotpuVoice sing rest`
- `robotpuVoice sing phonemes`
- `robotpuVoice set sing tempo`
- `robotpuVoice stop speaking`
- `music play`

## Example

The voice handlers are the same as the voice-only version, with two additions: each one updates `moving` (and `busyAction` for counted actions), and the `sing` handler rests the body first so the groove owns the servos. The `forever` loop at the bottom is the tracking code from [Object Tracking](object-tracking.md), wrapped in the `moving` / `showBusy` check.

```typescript
// servo trims      
robotPuPro.setServoTrim(0, -4)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -9)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -8)
robotPuPro.setServoTrim(5, 0)
robotPuPro.saveServoTrimCalibration()

const yawPattern = [20, 0, -20, 0]
const pitchPattern = [5, -25, 5, -15]
const legPattern = [8, 0, 8, 0]
const footPattern = [-8, 10, -8, -10]

function startGroove(bpm: number, energy: number, yawCenter:number, pitchCenter:number) {
    let beatMs = 60000 / bpm
    const beat = Math.floor(control.millis() / beatMs) % 4
    robotPuPro.servoStep(robotPuPro.ServoJoint.LeftFoot, 90 + footPattern[beat] * energy, 1.5 * energy)
    robotPuPro.servoStep(robotPuPro.ServoJoint.LeftLeg, 90 + legPattern[beat] * energy, 1.5 * energy)
    robotPuPro.servoStep(robotPuPro.ServoJoint.RightFoot, 90 + footPattern[beat] * energy, 1.5 * energy)
    robotPuPro.servoStep(robotPuPro.ServoJoint.RightLeg, 90 + legPattern[beat] * energy, 1.5 * energy)
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, yawCenter + yawPattern[beat] * energy, 1.5 * energy)
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, pitchCenter + pitchPattern[beat] * energy, 1.5 * energy)
}

robotpuVoice.setVoice(VoicePreset.RobotPU)
robotpuVoice.setVolume(255)
robotpuVoice.say("Hello everyone here! I am robot P U.")
robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
let showBusy = false
// face tracking state: moving is true while a voice-started action owns the body
let moving = false
let tracking = false
let busyAction = robotPuPro.Action.Rest
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
let trackSpeed = 0.1
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2

function singHappyBirthday() {
    robotpuVoice.say("Happy birthday to Robot P U!")
    robotpuVoice.singRest(4)
    robotpuVoice.singNote(SingNote.G4, "/HAE", 1)
    robotpuVoice.singNote(SingNote.G4, "PIY", 1)
    robotpuVoice.singNote(SingNote.A4, "BERTH", 4)
    robotpuVoice.singNote(SingNote.G4, "DEY", 4)
    robotpuVoice.singNote(SingNote.C5, "TUW", 4)
    robotpuVoice.singNote(SingNote.B4, "YUW", 8)
    robotpuVoice.singNote(SingNote.G4, "/HAE", 1)
    robotpuVoice.singNote(SingNote.G4, "PIY", 1)
    robotpuVoice.singNote(SingNote.A4, "BERTH", 4)
    robotpuVoice.singNote(SingNote.G4, "DEY", 4)
    robotpuVoice.singNote(SingNote.D5, "TUW", 4)
    robotpuVoice.singNote(SingNote.C5, "YUW", 8)
    robotpuVoice.singNote(SingNote.G4, "/HAE", 1)
    robotpuVoice.singNote(SingNote.G4, "PIY", 1)
    robotpuVoice.singNote(SingNote.G5, "BERTH", 4)
    robotpuVoice.singNote(SingNote.E5, "DEY", 4)
    robotpuVoice.singNote(SingNote.C5, "DIYR", 4)
    robotpuVoice.singNote(SingNote.B4, "ROW", 2)
    robotpuVoice.singNote(SingNote.B4, "BAAT", 2)
    robotpuVoice.singNote(SingNote.B4, "TER", 2)
    robotpuVoice.singNote(SingNote.A4, "PIY", 2)
    robotpuVoice.singNote(SingNote.A4, "YUW", 6)
    robotpuVoice.singNote(SingNote.F5, "/HAE", 1)
    robotpuVoice.singNote(SingNote.F5, "PIY", 1)
    robotpuVoice.singNote(SingNote.E5, "BERTH", 4)
    robotpuVoice.singNote(SingNote.C5, "DEY", 4)
    robotpuVoice.singNote(SingNote.D5, "TUW", 4)
    robotpuVoice.singNote(SingNote.C5, "YUW", 10)
}

function selfIntroduction() {
    robotpuVoice.say("Ladies and gentlemen, boys and girls!")
    robotpuVoice.say("Welcome to the Planet Sakukar!")
    robotpuVoice.rest(600)
    // Act 2: a poem about itself, in a different voice
    // robotpuVoice.setVoice(VoicePreset.LittleRobot)
    robotpuVoice.say("I am robot P U, small but proud.")
    robotpuVoice.say("My voice is squeaky. My beeps are loud.")
    robotpuVoice.say("I walk and I talk and I sing you a song.")
    robotpuVoice.say("With my micro-bit brain, I cannot go wrong!")
    robotpuVoice.rest(600)
    // Act 3: a run of sung notes — doe mee soh, then the high doe goes
    // through the music play block: real beats instead of hold counts.
    // "in background" queues it just like sing note; "until done" would
    // pause the show here while the queue empties first.
    robotpuVoice.say("I can sing!")
    robotpuVoice.setSingTempo(120)
    robotpuVoice.singNote(SingNote.C4, "DOW", 4)
    robotpuVoice.singNote(SingNote.E4, "MIY", 4)
    robotpuVoice.singNote(SingNote.G4, "SOH", 8)
    robotpuVoice.singNote(SingNote.D5, "RAY", 4)
    robotpuVoice.singNote(SingNote.F5, "FAA", 4)
    robotpuVoice.singNote(SingNote.A5, "LAA", 8)
    robotpuVoice.singRest(2)
    music.play(robotpuVoice.singNotePlayable(SingNote.C5, "DOW", music.beat(BeatFraction.Double)), music.PlaybackMode.InBackground)
    // Act 4: the short song — "I am a little robot" sung to the tune of
    // Twinkle Twinkle, all packed in one block: one syllable per note
    // (AY AEM AH LIH TL ROW BAAT on C C G G A A G)
    robotpuVoice.singPhonemes("#115AY4 #115AEM #77AH #77LIH4 #68TL #68ROW #77BAAAAT")
    // Encore: the thank-you goes through the music play block —
    // "spoken words" is say() living in a play socket
    music.play(robotpuVoice.sayPlayable("I am robot P U. Nice to meet you all. Thank you!"), music.PlaybackMode.UntilDone)
}

// ---------- voice commands ----------

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Jump, function () {
    moving = true
    busyAction = robotPuPro.Action.Jump
    robotPuPro.start(robotPuPro.Action.Jump, 1)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Go, function () {
    moving = true
    busyAction = robotPuPro.Action.Explore
    robotPuPro.start(robotPuPro.Action.Explore, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Dance, function () {
    moving = true
    busyAction = robotPuPro.Action.Dance
    robotPuPro.start(robotPuPro.Action.Dance, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Back, function () {
    moving = true
    busyAction = robotPuPro.Action.WalkBackward
    robotPuPro.start(robotPuPro.Action.WalkBackward, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    moving = false
    robotPuPro.start(robotPuPro.Action.Rest, 0)
    robotpuVoice.stopSpeaking()
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.TurnLeft, function () {
    moving = true
    busyAction = robotPuPro.Action.TurnLeft
    robotPuPro.start(robotPuPro.Action.TurnLeft, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.TurnRight, function () {
    moving = true
    busyAction = robotPuPro.Action.TurnRight
    robotPuPro.start(robotPuPro.Action.TurnRight, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Walk, function () {
    moving = true
    busyAction = robotPuPro.Action.Walk
    robotPuPro.start(robotPuPro.Action.Walk, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Kick, function () {
    moving = true
    busyAction = robotPuPro.Action.Kick
    robotPuPro.start(robotPuPro.Action.Kick, 1)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Sit, function () {
    moving = false
    robotPuPro.start(robotPuPro.Action.Sit, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stand, function () {
    moving = false
    robotPuPro.start(robotPuPro.Action.Stand, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Laugh, function () {
    moving = true
    busyAction = robotPuPro.Action.Laugh
    robotPuPro.start(robotPuPro.Action.Laugh, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Cry, function () {
    moving = true
    busyAction = robotPuPro.Action.Cry
    robotPuPro.start(robotPuPro.Action.Cry, 0)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Sing, function () {
    if (!showBusy) {
        showBusy = true
        moving = false
        // rest first so the groove owns the servos
        robotPuPro.start(robotPuPro.Action.Rest, 0)
        control.inBackground(function () {
            singHappyBirthday()
            showBusy = false
        })
        control.inBackground(function () {
            while (showBusy){
                startGroove(40, 2, 90, 90)
                basic.pause(10)
            }
            robotPuPro.start(robotPuPro.Action.Stand, 0)
        })
    }
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Talk, function () {
    if (!showBusy) {
        showBusy = true
        control.inBackground(function () {
            selfIntroduction()
            showBusy = false
        })
    }
})

// ---------- eye tracking ----------

// main loop: track a face whenever the body is idle
basic.forever(function () {
    now = input.runningTime()
    // counted one-shot actions (kick, jump) finish by themselves
    if (moving && robotPuPro.isDone(busyAction)) {
        moving = false
    }
    if (moving || showBusy) {
        // a voice action or a show owns the servos, including the head
        tracking = false
    } else {
        if (!tracking) {
            // take over the servos once and keep the current body pose
            tracking = true
            smoothYaw = 0
            smoothPitch = 0
            robotPuPro.start(robotPuPro.Action.API, 0)
        }
        // Track the face if it is visible
        if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
            detectionInterval = now - followLastTime
            followLastTime = now
            // soft light of eyes, and look at you
            robotPuPro.leftEyeBright(0.05)
            robotPuPro.rightEyeBright(0.05)
            // get the angle to the face
            yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
            pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
            // Smooth the measured angles
            smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
            smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
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
            robotPuPro.blink(5)
        }
        // Read the current head position and add the offset
        targets = robotPuPro.servoTargets()
        currentYaw = targets[4]
        currentPitch = targets[5]
        // Move head toward the face
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    }
    basic.pause(5)
})
```

## Tuning

- `trackGain` (0.2) and `trackSpeed` (0.1): same as in [Object Tracking](object-tracking.md). Increase `trackGain` for faster tracking; too high causes overshoot or oscillation.
- `lostTimeout` (1000 ms) and `decay` (0.7): how long the head follows through after the face disappears before giving up and standing to search.
- The long-lost branch calls `robotPuPro.stand()`, which stands the robot up to look for you — even if it was sitting. Swap it for `robotPuPro.sit()` if you want the robot to stay seated while searching.
- `jump` and `kick` are started with `steps = 1` so they run once and tracking resumes when `is %action done` fires. `laugh` and `cry` use `steps = 0`, so they keep going (and keep tracking paused) until you say `stop`.
- One-shot actions that finish while `moving` is `true` are detected by `busyAction`. If you add more one-shot commands, remember to set both `moving = true` and `busyAction = ...` in the handler.
- Because `API` mode freezes the body at its current pose, saying `sit` and then immediately walking in front of the camera may leave the robot part-way into the sit. Say `sit` again, or wait a moment before stepping in view.

## What to try next

- Keep eye contact while the robot talks: remove the `showBusy` check for the `talk` show (use a separate flag for `sing`, since the groove owns the head) so the eyes keep tracking during `selfIntroduction`.
- Make the robot react when a face first appears: use `on %object detected` to say "hello" or glow the eyes brighter.
- Say the direction of the face while tracking, like in the directional voice feedback example from [Face Interaction](face-interaction.md).
- Add the remaining voice commands (`scream`, `funny`, `greet`, `drive`, `duck`) — decide for each whether it counts as `moving`.
