---
name: Sit, Watch, and Chat
description: Put the robot in a sitting pose, let it look around for a face, then track and chat with the person it finds.
---

# Sit, Watch, and Chat

Make Robot PU sit in one place, scan for faces, and start a conversation when it finds someone. The head sweeps through random yaw and pitch positions until a face appears, then it tracks the face and randomly speaks from a list of conversation starters.

## Goal

- Put the robot in a sitting pose with `robotPuPro.sit()`.
- Move the head randomly while searching: yaw between `-60` and `60`, pitch between `-60` and `15`.
- Track a face with the head when one is detected.
- Make the robot randomly say a phrase from a list of 30 conversation starters.

## How it works

1. `robotPuCap.startCogniCap()` starts the camera and AI pipeline.
2. `robotPuCap.enableDetections([...])` enables **only** face detection.
3. A short start-up sound gets the audio system ready.
4. `robotPuPro.sit()` puts the body in a sitting pose before the loop begins.
5. In the main loop:
   - `robotPuPro.servoTargets()` reads the current head angles (`index 4` is yaw, `index 5` is pitch).
   - When a face is detected, the robot softens its eyes, reads `yaw` and `pitch`, and smooths the angles with a low-pass filter.
   - The head is stepped toward `currentYaw + smoothYaw * trackGain` and `currentPitch + smoothPitch * trackGain`.
   - Every loop there is a small random chance (`randint(0, 68) == 1`) the robot will pick a random phrase from `talkContent` and say it.
   - When no face is detected, the robot adds a small random step to the current head angles every 1.5-3 seconds, then clamps the result to `yaw [-60, 60]` and `pitch [-60, 15]`. It smooths the difference between the current position and the new target, then steps the head toward it.
   - The eyes blink while searching so you can tell it is active.
6. The battery level is logged occasionally (`randint(0, 3000) == 1`) so you know the robot is still powered.

## Blocks used

- `start CogniCap`
- `enable detections`
- `object detected`
- `object yaw`
- `object pitch`
- `set servo trim`
- `start action`
- `servo step`
- `servo targets`
- `sit`
- `blink`
- `left eye bright`
- `right eye bright`
- `music set volume`
- `music play`
- `robotpuVoice set voice`
- `robotpuVoice say`
- `battery level`

## Example

let currentPitch = 0
let currentYaw = 0
let targets: number[] = []
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let now = 0
let decay = 0.95
let searchYaw = 0
let searchPitch = 0
let nextLook = 0
let lookInterval = 2000
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
music.play(music.createSoundExpression(WaveShape.Sine, 5000, 0, 255, 0, 500, SoundExpressionEffect.None, InterpolationCurve.Linear), music.PlaybackMode.UntilDone)
robotpuVoice.setVoice(VoicePreset.RobotPU)
robotPuPro.setServoTrim(0, -5)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -9)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, 0)
robotPuPro.setServoTrim(5, 0)
// sit down before looking around
robotPuPro.sit()
// main event loop
basic.forever(function () {
    now = input.runningTime()
    // Read current head position
    targets = robotPuPro.servoTargets()
    currentYaw = targets[4]
    currentPitch = targets[5]
    // Track the face if it is visible
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        // soft light of eyes, and look at you
        robotPuPro.leftEyeBright(0.05)
        robotPuPro.rightEyeBright(0.05)
        // get the angle to the object
        yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Face)
        pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Face)
        // Smooth the measured angles
        smoothYaw = 0.5 * smoothYaw + 0.5 * yaw
        smoothPitch = 0.5 * smoothPitch + 0.5 * pitch
        // random talk
        if (randint(0, 68) == 1) {
            robotpuVoice.say(talkContent[randint(0, talkContent.length - 1)])
        }
        nextLook = now + lookInterval
        lookInterval = randint(1500, 3000)
    } else {
        // No face: pick a new random head position every 1.5-3 seconds
        if (now < nextLook ) {
            // Smooth the difference between current head position and the random target
            smoothYaw *= decay
            smoothPitch *= decay
            //erial.writeLine("decay")  
        } else {
            if (randint(0, 100) == 1) {
               smoothYaw=randint(-40, 40)
               smoothPitch=randint(-20, 20)
            }
            //serial.writeLine("interval")
        }
        // eyes brighter while searching
        robotPuPro.blink(1)
        robotPuPro.sit()
    }
    // Move head toward the target
    robotPuPro.start(robotPuPro.Action.API, 0)
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    if (randint(0, 3000) == 1) {
        serial.writeLine('battery ' + robotPuPro.batteryLevel() + " percent")
    }
    basic.pause(5)
})
```

## Tuning

- `trackGain` (0.2): scales the head target offset. Higher makes the head snap to the face or random target faster; lower is smoother.
- `trackSpeed` (0.1): scales the servo step duration. Larger values make the head move slower (longer steps); smaller values make it faster and may overshoot.
- `lookInterval` (2000 ms initial): the timer that picks the next random look position. The actual interval is randomized between `1500` and `3000` ms each time to make the scanning feel natural.
- `randint(-15, 15)` and `randint(-10, 10)`: the random step sizes added to the current yaw and pitch while searching. Increase them to cover more ground faster; decrease them for slower, smoother scanning. The `Math.max / Math.min` clamps keep the head inside the `yaw [-60, 60]` and `pitch [-60, 15]` limits.
- `randint(0, 68) == 1`: the random chance of saying a phrase each loop. Raise `68` to speak less often.
- `randint(0, 3000) == 1`: the random chance of logging the battery level over serial. Raise it to log less often.
- `0.5` in the smoothing filter: give more weight to the `old` value for smoother, slower motion; give more weight to the `new` value for snappier tracking.

## What to try next

- Track the **ball** or **goal** instead of the face by changing `CapObject.Face` to `CapObject.Ball` or `CapObject.Goal`.
- Add a waving arm or happy eyes when a face is first detected.
- Use the face's `y_mm` distance to say "come closer" or "back up" while the robot stays sitting.
