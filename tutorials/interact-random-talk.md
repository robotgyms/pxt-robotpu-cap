---
name: Simple Interact Talk
description: Make Robot PU interact with you and talk when it sees you. The talk content is randomly selected from a list.
---

# Simple Interact Talk

Make Robot PU track your face with its head, dance while it sees you, and occasionally start a conversation using one of 30 random conversation starters. When it loses you, the head slowly recentres and the robot starts exploring.

## Goal

- Use the CogniCap face detector to find and track a person.
- Move the head smoothly toward the face using `servoStep`.
- Make the robot dance while tracking and randomly talk when it sees you.
- Pick sentences from a categorized list of 30 conversation starters.
- Enter an `explore` behaviour when the face has been lost for a while.

## How it works

1. `robotPuCap.startCogniCap()` starts the camera and the AI pipeline.
2. `robotPuCap.enableDetections([...])` enables **only** face detection, saving ESP32-S3 processing power.
3. `billy.voicePreset(...)` and a short start-up sound get the speech system ready.
4. In the main loop:
   - When a face is detected, the robot softens its eyes, updates `smoothYaw` and `smoothPitch` with a low-pass filter, and reads the current head target angles.
   - `robotPuPro.dance()` keeps the body moving while the head tracks.
   - Every loop there is a small random chance (`randint(0, 30) == 1`) the robot will pick a random phrase from `talkContent` and say it.
   - `talkContent` now holds 30 conversation starters grouped into categories: *Casual & Everyday*, *Work, Tech & Projects*, *Interests & Curiosity*, *Events, Meetups & Networking*, and *Quick & Thought-Provoking*.
   - The head is stepped toward `currentYaw + smoothYaw * trackGain` and `currentPitch + smoothPitch * trackGain` with a speed proportional to `trackSpeed`.
5. If the face is lost for less than the last measured detection interval, the smoothed angles decay by `0.95` and the eyes blink once. The robot keeps dancing.
6. If the face is lost for longer than the last detection interval but less than `lostTimeout` (3000 ms), the head is recentred (`smoothYaw = 0`, `smoothPitch = 0`), the eyes blink twice, and the robot stands still.
7. After `lostTimeout`, the robot calls `robotPuPro.explore()` to look around and blinks five times to show it is searching.

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
- `dance`
- `blink`
- `left eye bright`
- `right eye bright`
- `explore`
- `billy voice preset`
- `billy say`
- `music play`
- `music set volume`

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
let lostTimeout = 3000
let decay = 0.95
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
    "Yo!",
    "See you later",
    "Goodbye",
    // Casual & Everyday
    "How has your week been treating you?",
    "What are you working on right now?",
    "Anything exciting planned for this weekend?",
    "How do you usually like to unwind after a long day?",
    "What has been the best part of your day so far?",
    "Working on any fun side projects lately?",

    // Work, Tech & Projects
    "What is the most interesting challenge you tackled recently?",
    "Any new tools or software you are experimenting with?",
    "What inspired you to start your current project?",
    "How did you first get into your field?",
    "Are you learning any new skills or frameworks right now?",
    "What is one piece of advice you would give to someone starting out?",

    // Interests & Curiosity
    "Read or watched anything interesting lately?",
    "What is a topic you could talk about for hours?",
    "If you had an extra full day off this week, how would you spend it?",
    "Have you tried any great new restaurants or recipes recently?",
    "What is something new you tried recently that surprised you?",
    "Where is the most memorable place you have traveled?",

    // Events, Meetups & Networking
    "What brought you to this event today?",
    "Have you seen any standout demos or presentations so far?",
    "Are you local to the area, or did you travel in for this?",
    "What are you hoping to take away from today?",
    "Have you attended this meetup/event before?",
    "Who have you met so far that I should connect with?",

    // Quick & Thought-Provoking
    "What is something you are really looking forward to this month?",
    "If you could automate one mundane task in your life, what would it be?",
    "What is a common belief in your industry that you disagree with?",
    "What is the most useful gadget or tool you bought recently?",
    "If you could master any skill instantly, what would it be?",
    "What is a goal you are focused on achieving right now?"
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
        robotPuPro.dance()
        if (randint(0, 30) == 1) {
            music.setVolume(254)
            billy.say(talkContent[randint(0, talkContent.length - 1)])
        }
    } else if (now - followLastTime < Math.min(detectionInterval, lostTimeout)) {
        // follow through
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        // eyes brighter
        robotPuPro.blink(1)
        robotPuPro.dance()
    } else if (now - followLastTime < lostTimeout) {
        smoothYaw = 0
        smoothPitch = 0
        // eyes much brighter
        robotPuPro.blink(2)
        robotPuPro.stand()
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
- `decay` (0.95): how quickly the head drifts back to the centre when the face is briefly lost. Closer to 1 keeps the head pointed at the last seen position longer.
- `lostTimeout` (3000 ms): time after which the head recentres, then later the robot starts exploring.
- `randint(0, 30) == 1`: the random chance of speaking each loop. With `basic.pause(5)`, this means the robot may speak a few times per second when looking at you. Lower `30` to make it talk less often, or raise it to make it more chatty.
- Add more strings to `talkContent` to give the robot a wider vocabulary. You can also add more categories by inserting new `//` comments and string entries.

## What to try next

- Track the **ball** or **goal** instead of the face by changing `CapObject.Face` to `CapObject.Ball` or `CapObject.Goal`.
- Change `robotPuPro.dance()` to `robotPuPro.stand()` if you want the body still while tracking.
- Use the `detectionInterval` to make the robot talk only when a new face is first detected, instead of randomly while tracking.
