---
name: Walkie-Talkie
description: Follow a face with the head, walk toward or away from it, and hold a conversation with random sentences.
---

# Walkie-Talkie

Build a walkie-talkie robot that follows a person's face with its head, walks toward them or backs away to keep a comfortable distance, and starts random conversations. If the face is lost for a few seconds, it explores to find someone new to talk to.

## Goal

- Track a face with both head and body movement.
- Use the face's yaw to turn the robot toward the person.
- Use the face's y-distance to walk forward when far away and back up when too close.
- Speak a random phrase from a list of 30 conversation starters.
- Explore for a new face after being alone for a while.

## How it works

1. `robotPuCap.startCogniCap()` starts the camera and AI pipeline.
2. `robotPuCap.enableDetections([...])` enables **only** face detection to save processing power.
3. `billy.voicePreset(...)` and a short start-up sound get the speech system ready.
4. In the main loop:
   - When a face is detected, the robot dims its eyes, reads `yaw`, `pitch`, and `y_mm` from the face packet, and smooths the angles.
   - `walkSpeed` is computed from `(y_mm - 500) * 0.2` and clamped to `[-6, 6]`. The robot moves forward if the face is further than 500 mm, and backs up if it is closer.
   - `walkTurn` is computed from `smoothYaw * -0.2` and clamped to `[-1, 1]`. A low-pass filter blends it with the previous turn so the body turns smoothly toward the face.
   - `smoothYaw -= walkTurn` subtracts the body turn from the head target so the gaze stays stable while the body turns.
   - `robotPuPro.walk(walkSpeed, walkTurn)` moves the robot.
   - Every loop there is a small random chance (`randint(0, 68) == 1`) the robot will pick a random phrase from `talkContent` and say it.
   - `talkContent` holds 30 conversation starters grouped into categories: *Casual & Everyday*, *Work, Tech & Projects*, *Interests & Curiosity*, *Events, Meetups & Networking*, and *Quick & Thought-Provoking*.
   - The head is stepped toward `currentYaw + smoothYaw * trackGain` and `currentPitch + smoothPitch * trackGain` with a speed proportional to `trackSpeed`.
5. If the face is lost for less than the larger of the last detection interval or `lostTimeout` (5000 ms), the smoothed angles, `walkSpeed`, and `walkTurn` decay by `0.95`, the eyes blink once, and the robot keeps walking.
6. If the face is lost for longer than that but less than `2 * lostTimeout`, the head is recentred (`smoothYaw = 0`, `smoothPitch = 0`), the eyes blink twice, and the robot stands still.
7. After `2 * lostTimeout`, the robot calls `robotPuPro.explore()` to look around and blinks five times to show it is searching.
8. There is a small chance each loop (`randint(0, 3000) == 1`) that the robot announces the battery level.

## Blocks used

- `start CogniCap`
- `enable detections`
- `object detected`
- `object yaw`
- `object pitch`
- `object y`
- `set servo trim`
- `set mode`
- `servo step`
- `servo targets`
- `stand`
- `walk`
- `explore`
- `blink`
- `left eye bright`
- `right eye bright`
- `billy voice preset`
- `billy say`
- `music set volume`
- `music play`
- `battery level`

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
let lostTimeout = 5000
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
robotPuPro.setServoTrim(0, -2)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)
let walkSpeed = 0
let walkTurn = 0
let objectFound = 0
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
        let y_mm = robotPuCap.objectY(robotPuCap.CapObject.Face)
        // Smooth the measured angles
        smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
        smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
        // Read the current head position and add the offset
        targets = robotPuPro.servoTargets()
        currentYaw = targets[4]
        currentPitch = targets[5]
        //serial.writeLine("yaw:" + smoothYaw)
        //serial.writeLine("pitch:" + smoothPitch)
        walkSpeed = Math.max(-6, Math.min(6, (y_mm - 500) * 0.2))
        walkTurn = (walkTurn + Math.max(-1, Math.min(1, smoothYaw * -0.2))) * 0.5
        // use the computed walk speed and turn to move the robot
        robotPuPro.walk(walkSpeed, walkTurn)
        smoothYaw -= walkTurn // compensate the walk turn angle
        if (randint(0, 68) == 1) {
            music.setVolume(254)
            billy.say(talkContent[randint(0, talkContent.length - 1)])
        }
    } else if (now - followLastTime < Math.max(detectionInterval, lostTimeout)) {
        // follow through
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        walkSpeed *= decay
        walkTurn *= decay 
        // eyes brighter
        robotPuPro.blink(1)
        robotPuPro.walk(walkSpeed, walkTurn)
    } else if (now - followLastTime < 2*lostTimeout) {
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
    if (randint(0, 3000) == 1) {
        billy.say('battery ' + robotPuPro.batteryLevel() + " percent")
    }
    basic.pause(5)
})
```

## Tuning

- `trackGain` (0.2): how far the head moves per unit of face angle. Higher values make the head snap to the face faster but may overshoot.
- `trackSpeed` (0.1): the maximum step speed for the head. Higher values make the head move faster; lower values are smoother.
- `walkSpeed` gain (0.2): multiplies the distance error `(y_mm - 500)` to set the forward/back-up speed. Increase to approach faster; decrease to move more gently.
- `walkTurn` gain (`-0.2`): how aggressively the body turns toward the face. The negative sign makes the robot turn toward the side the face is on. Increase the magnitude to turn faster.
- `walkTurn` smoothing (0.5): the low-pass filter blending factor. Higher values keep the previous turn more, making the robot turn more smoothly.
- `smoothYaw -= walkTurn`: this compensates the head yaw target for the body turn so the eyes keep looking at the face while the robot turns. If the head lags behind or overshoots, adjust `walkTurn` gain or this compensation.
- `decay` (0.95): how quickly the head and walking speeds decay when the face is briefly lost. Closer to 1 keeps the previous motion longer.
- `lostTimeout` (5000 ms): the base time used for the lost-face phases. The first phase uses `max(detectionInterval, lostTimeout)` and the second phase uses `2 * lostTimeout`.
- `randint(0, 68) == 1`: the random chance of speaking each loop. With `basic.pause(5)`, this means the robot may talk frequently. Lower 68 to make it less chatty, or raise it to make it talk more.
- `randint(0, 3000) == 1`: the random chance of announcing battery level each loop. Raise it to announce less often.
- Add more strings to `talkContent` to give the robot a wider vocabulary.

## What to try next

- Change `CapObject.Face` to `CapObject.Ball` and make the robot follow and talk to a soccer ball.
- Add a waving arm gesture when a new face is first detected.
- Use `onObjectDetected` to make the robot say a fixed greeting the first time it sees someone, then random sentences after that.
