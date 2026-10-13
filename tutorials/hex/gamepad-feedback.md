```typescript
radio.onReceivedValue(function (name, value) {
    // a gamepad command ends attention and owns the servos, like a voice
    // command — otherwise the tracking loop's start(API) would kill the
    // action within 10 ms and clear its watchdog
    attentive = false
    robotPuPro.runKeyValueCommand(name, value)
})

input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    robotPuPro.toggleServoTrim()
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
let attentiveUntil = 0
let attentive = false
let voicePhrase: string[] = []
// VoiceAction tokens are NOT the same numbers as robotPuPro.Action
// (voice "walk" is 14, Action.Walk is 10), so dictionaries translate
// each voice token into the action, step count and phrase to use.
// Add a command by adding one row to each dictionary.
let voiceAction: number[] = []
let voiceSteps: number[] = []
let cmd = 0
robotPuPro.setChannel(163)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.LeftFoot, 0)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.RightFoot, 12)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadYaw, 0)
robotPuPro.saveServoTrimCalibration()
robotPuPro.start(robotPuPro.Action.Rest, 0)
robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
robotpuVoice.setVoice(VoicePreset.RobotPU)
robotpuVoice.say("Hello, I am Robot P U. Nice to meet you!")
// wake word — eyes flash even before "p u" is heard
robotPuCap.onWakeWord(function () {
    robotPuPro.leftEyeBright(0.1)
    robotPuPro.rightEyeBright(0.1)
})
voicePhrase[robotPuCap.VoiceAction.Attention] = "Yes? What is up?"
voiceAction[robotPuCap.VoiceAction.Drive] = robotPuPro.Action.Drive
voicePhrase[robotPuCap.VoiceAction.Drive] = "Remote control mode. Drive safely!"
voiceAction[robotPuCap.VoiceAction.Walk] = robotPuPro.Action.Walk
voicePhrase[robotPuCap.VoiceAction.Walk] = "Tippy-toe, tippy-toe, let's go!"
voiceAction[robotPuCap.VoiceAction.Back] = robotPuPro.Action.WalkBackward
voicePhrase[robotPuCap.VoiceAction.Back] = "Beep, beep, beep! Backing up!"
voiceAction[robotPuCap.VoiceAction.Left] = robotPuPro.Action.TurnLeft
voicePhrase[robotPuCap.VoiceAction.Left] = "Spinny left! Wheeee!"
voiceAction[robotPuCap.VoiceAction.Right] = robotPuPro.Action.TurnRight
voicePhrase[robotPuCap.VoiceAction.Right] = "Spinny right! Whoooosh!"
voiceAction[robotPuCap.VoiceAction.Dance] = robotPuPro.Action.Dance
voicePhrase[robotPuCap.VoiceAction.Dance] = "Wiggle, giggle, shake it up!"
voiceAction[robotPuCap.VoiceAction.Jump] = robotPuPro.Action.Jump
voicePhrase[robotPuCap.VoiceAction.Jump] = "Boing, boing, boing! High five!"
voiceAction[robotPuCap.VoiceAction.Kick] = robotPuPro.Action.Kick
voiceSteps[robotPuCap.VoiceAction.Kick] = 1
voicePhrase[robotPuCap.VoiceAction.Kick] = "Big kick! GOOOAL!"
voiceAction[robotPuCap.VoiceAction.Sit] = robotPuPro.Action.Sit
voicePhrase[robotPuCap.VoiceAction.Sit] = "Plop! Down on the floor!"
voiceAction[robotPuCap.VoiceAction.Stand] = robotPuPro.Action.Stand
voicePhrase[robotPuCap.VoiceAction.Stand] = "Up, up, up! Big and tall!"
voiceAction[robotPuCap.VoiceAction.Stop] = robotPuPro.Action.Rest
voicePhrase[robotPuCap.VoiceAction.Stop] = "Freeze! Like a statue!"
voicePhrase[robotPuCap.VoiceAction.Record] = "Tell me a secret! Listening!"
voicePhrase[robotPuCap.VoiceAction.Video] = "Action! Movie star time!"
voicePhrase[robotPuCap.VoiceAction.Photo] = "Say CHEEEESE.."
// one handler catches every voice token — "p u" / "pew" arrives as token 30
robotPuCap.onVoiceCommand(function () {
    cmd = robotPuCap.lastVoiceCommand()
    // reset control vector to 0 to avoid falling
    robotPuPro.setControlOffsets([
    0,
    1,
    2,
    3,
    4,
    5
    ], [
    0,
    0,
    0,
    0,
    0,
    0
    ])
    // robotpuVoice.say(voicePhrase[cmd] || "Haa Hah")
    if (cmd == robotPuCap.VoiceAction.Attention) {
        attentive = true
        attentiveUntil = input.runningTime() + 30000
        robotPuPro.leftEyeBright(0.01)
        robotPuPro.rightEyeBright(0.01)
        // stand up to pay attention
        robotPuPro.start(robotPuPro.Action.Stand, 0)
        robotpuVoice.say(voicePhrase[cmd])
    } else if (cmd == robotPuCap.VoiceAction.Sing) {
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
        robotpuVoice.singNote(SingNote.A4, "PIY", 2)
        robotpuVoice.singNote(SingNote.A4, "YUW", 6)
        robotpuVoice.singNote(SingNote.F5, "/HAE", 1)
        robotpuVoice.singNote(SingNote.F5, "PIY", 1)
        robotpuVoice.singNote(SingNote.E5, "BERTH", 4)
        robotpuVoice.singNote(SingNote.C5, "DEY", 4)
        robotpuVoice.singNote(SingNote.D5, "TUW", 4)
        robotpuVoice.singNote(SingNote.C5, "YUW", 10)
    } else {
        // a real command after "p u" ends attention and owns the servos
        attentive = false
        // ignore tokens with no action entry — "record", "video", "photo"
        // and unmapped phrases; start(undefined) corrupts the action state
        if (voiceAction[cmd] !== undefined) {
            robotPuPro.start(voiceAction[cmd], voiceSteps[cmd] || 0)
        }
        if (voicePhrase[cmd] !== undefined) {
            robotpuVoice.say(voicePhrase[cmd])
        }
    }
})
let lostTimeout = 1000
let decay = 0.7
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.1
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
// main event loop
basic.forever(function () {
    if (attentive) {
        now = input.runningTime()
        if (now > attentiveUntil) {
            // attention expired — dim the eyes and relax
            attentive = false
            robotPuPro.leftEyeBright(0.02)
            robotPuPro.rightEyeBright(0.02)
            robotPuPro.start(robotPuPro.Action.Rest, 0)
            robotpuVoice.say("See you later!")
        } else {
            // API mode does nothing, so no behaviour fights for the servos
            robotPuPro.start(robotPuPro.Action.API, 0)
            // Track the chosen object if it is visible
            // serial.writeLine("yaw:" + smoothYaw)
            // serial.writeLine("pitch:" + smoothPitch)
            if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
                detectionInterval = now - followLastTime
                attentiveUntil = input.runningTime() + 30000
                followLastTime = now
                // soft light of eyes, and look at you
                robotPuPro.leftEyeBright(0.01)
                robotPuPro.rightEyeBright(0.01)
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
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.3, Math.abs(smoothYaw * trackSpeed)))
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.3, Math.abs(smoothPitch * trackSpeed)))
        }
        basic.pause(10)
    } else {
        basic.pause(500)
    }
})
```