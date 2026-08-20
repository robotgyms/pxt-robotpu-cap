---
name: Simple Interact Talk
description: Make Robot PU interact with you and talk when it sees you. The talk content is randomly selected from a list.
---

# Simple Interact Talk

Make Robot PU track your face with its head and occasionally say one of several random greetings. When it loses you, it slowly forgets where you were, then starts exploring to find you again.

## Goal

- Use the CogniCap face detector to find and track a person.
- Move the head smoothly toward the face using `servoStep`.
- Make the robot randomly talk when it sees you.
- Enter an `explore` behaviour when the face has been lost for a while.

## How it works

1. `robotPuCap.startCogniCap()` starts the camera and the AI pipeline.
2. `robotPuCap.enableDetections([...])` enables **only** face detection, saving ESP32-S3 processing power.
3. `billy.voicePreset(...)` and a short start-up sound get the speech system ready.
4. In the main loop:
   - When a face is detected, the robot softens its eyes, updates `smoothYaw` and `smoothPitch` with a low-pass filter, and reads the current head target angles.
   - `robotPuPro.stand()` keeps the body still while the head tracks.
   - Every loop there is a small random chance (`randint(0, 30) == 1`) the robot will pick a random phrase from `talkContent` and say it.
   - The head is stepped toward `currentYaw + smoothYaw * trackGain` and `currentPitch + smoothPitch * trackGain` with a speed proportional to `trackSpeed`.
5. If the face is lost for less than the last measured detection interval, the smoothed angles decay by `0.7` and the eyes blink once.
6. If the face is lost for longer than `1 * lostTimeout` but less than `2 * lostTimeout`, the head is centred and the eyes blink twice.
7. After `2 * lostTimeout`, the robot enters `robotPuPro.explore()` to look around and blinks five times to show it is searching.

## Blocks used

- `start CogniCap`
- `enable detections`
- `object detected`
- `object yaw`
- `object pitch`
- `set servo trim`
- `set mode`
- `servo step`
- `servo targets`
- `stand`
- `blink`
- `left eye bright`
- `right eye bright`
- `explore`
- `billy voice preset`
- `billy say`
- `music play`

## Example

```typescript
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
let talkContent = [
"How are you?",
"Hiiiiii!",
"Hewwo!",
"Peekaboo!",
"Howdy!",
"Aloha!",
"Rawr!",
"Ta-da!",
"Boop!",
"Hai!",
"Yo!"
]
robotPuCap.startCogniCap()
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.1
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
billy.voicePreset(BillyVoicePreset.LittleRobot)
music.play(music.createSoundExpression(WaveShape.Sine, 5000, 0, 255, 0, 500, SoundExpressionEffect.None, InterpolationCurve.Linear), music.PlaybackMode.UntilDone)
robotPuPro.setServoTrim(0, -5)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)
// main event loop
basic.forever(function () {
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
        robotPuPro.stand()
        if (randint(0, 30) == 1) {
            music.setVolume(255)
            billy.say(talkContent[randint(0, talkContent.length - 1)])
        }
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
        robotPuPro.explore()
        // eyes so bright to look for you
        robotPuPro.blink(5)
    }
    // Move head toward the object
    robotPuPro.setMode(robotPuPro.Mode.API)
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    basic.pause(5)
})
```

## Tuning

- `trackGain` (0.2): how far the head moves per unit of face angle. Higher values make the head snap to the face faster but may overshoot.
- `trackSpeed` (0.1): the maximum step speed for the head. Higher values make the head move faster; lower values are smoother.
- `decay` (0.7): how quickly the head drifts back to the centre when the face is briefly lost. Closer to 1 keeps the head pointed at the last seen position longer.
- `lostTimeout` (1000 ms): time after which the head recentres, then later the robot starts exploring.
- `randint(0, 30) == 1`: the random chance of speaking each loop. With `basic.pause(5)`, this means the robot may speak a few times per second when looking at you. Lower `30` to make it talk less often, or raise it to make it more chatty.
- Add more strings to `talkContent` to give the robot a wider vocabulary.

## What to try next

- Track the **ball** or **goal** instead of the face by changing `CapObject.Face` to `CapObject.Ball` or `CapObject.Goal`.
- Make the robot wave its arm or do a small dance when it sees you.
- Use the `detectionInterval` to make the robot talk only when a new face is first detected, instead of randomly while tracking.
