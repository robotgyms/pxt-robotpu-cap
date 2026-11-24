```typescript
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
voiceAction[robotPuCap.VoiceAction.Go] = robotPuPro.Action.Explore
voicePhrase[robotPuCap.VoiceAction.Go] = "Treature hunting!"
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
voiceAction[robotPuCap.VoiceAction.Rest] = robotPuPro.Action.Rest
voicePhrase[robotPuCap.VoiceAction.Rest] = "I am on vacation!"
voiceAction[robotPuCap.VoiceAction.Stop] = robotPuPro.Action.Rest
voicePhrase[robotPuCap.VoiceAction.Stop] = "I am so tired!"
// record, video and photo run on the cap itself — phrase only, no action
voicePhrase[robotPuCap.VoiceAction.Record] = "Recording!"
voicePhrase[robotPuCap.VoiceAction.Video] = "Rolling!"
voicePhrase[robotPuCap.VoiceAction.Photo] = "Cheese!"

// tweak them for tracking response; high values will cause oscillation
let trackGain = 0.08
let trackSpeed = 0.3
let attentiveUntil = 0
let cmd = 0
let state = 0
let musicCount = 0

robotPuPro.setServoTrim(robotPuPro.ServoJoint.LeftFoot, -4)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.RightFoot, -4)
robotPuPro.saveServoTrimCalibration()

robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)

// turn on neccessary detections 
robotPuCap.enableDetections([robotPuCap.CapObject.Face, robotPuCap.CapObject.Ball, robotPuCap.CapObject.Qr])

// enable voice control
robotpuVoice.setVoice(VoicePreset.RobotPU)

// start Explore
robotPuPro.start(robotPuPro.Action.Explore, 0)

// when face found
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    if (state != 1) {
        attentiveUntil = input.runningTime() + 30000
        // say somthing here
        state = 1
    }
})

// when ball found
robotPuCap.onObjectDetected(robotPuCap.CapObject.Ball, function () {
    if (state != 4 && state != 1) {
        attentiveUntil = input.runningTime() + 30000
        // say somthing here
        state = 4
    }
})

// when hear voice commands
robotPuCap.onVoiceCommand(function () {
    cmd = robotPuCap.lastVoiceCommand()
    attentiveUntil = input.runningTime() + 30000
    // reset control vector to 0 to avoid falling
    robotPuPro.setControlOffsets([0, 1, 2, 3, 4, 5], [0, 0, 0, 0, 0, 0])
    if (cmd == robotPuCap.VoiceAction.Attention) {
        state = 1
        robotpuVoice.say(voicePhrase[cmd])
    } else {
        if (voiceAction[cmd] != undefined) {
            robotPuPro.start(voiceAction[cmd], voiceSteps[cmd] || 0)
            state = 5
        }
        if (voicePhrase[cmd] != undefined) {
            robotpuVoice.say(voicePhrase[cmd])
        }
    }
})

function stateTimeOut (){
    if (input.runningTime() >= attentiveUntil ){
        if (state != 0){
            // do Explore
            robotPuPro.start(robotPuPro.Action.Explore, 0)
            state = 0
        }
    }
}

function cuteTalk(howOften: number = 300){
    if (randint(0, howOften) == 0) {
        // say something by qtable to engaging more human interaction
    }
}


// main event loop
basic.forever(function () {
    // check music, if music hear, state = 3
    if (robotPuPro.isMusic()){
        musicCount +=1
    } else {
        musicCount = 0
    }

    if (musicCount >=50){
        robotPuPro.start(robotPuPro.Action.Dance, 0)
        state = 3
        attentiveUntil = input.runningTime() + 30000 // set dance timer
    }

    // state machine
    switch(state){
        case 0: // explore
            cuteTalk(500)
            break
        case 1: // follow face
            robotPuPro.leftEyeBright(0.01)
            robotPuPro.rightEyeBright(0.01)
            robotPuCap.headTrackObject(robotPuCap.CapObject.Face, trackGain, trackSpeed)
            stateTimeOut() // if nobody say someting, it will time out
            cuteTalk(300)
            break
        case 2: // search Face
            robotPuCap.searchForObject(robotPuCap.CapObject.Face)
            cuteTalk(300)
            stateTimeOut()
            break;
        case 3: // Dance
            cuteTalk(1000)
            stateTimeOut() 
            break
        case 4: // follow Ball
            robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, 0.2, 0.7)
            cuteTalk(500)
            stateTimeOut() // if nobody cheer up, it will time out
            break
        case 5: // other voice actions
            cuteTalk(500)
            stateTimeOut() // if no more command, it will time out
            break;
        default:
            break
    }
    serial.writeLine("state:"+ state)
    basic.pause(10)
})
```
