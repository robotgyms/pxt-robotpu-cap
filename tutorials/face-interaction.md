# Face Interaction with CogniCap

## Goal

Keep Robot PU's head pointed at a person's face and react when a face appears.

## How it works

The `head track %object` block reads the yaw and pitch of the selected object from the latest I2C packet, then moves the head yaw and pitch servos toward it. It uses a small smoothing filter so the motion is steady and per-object gains to control response speed.

## Blocks used

- `start CogniCap`
- `head track %object pitch gain %pitchSpeedGain yaw gain %yawSpeedGain`
- `on %object detected`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.headTrackObject(robotPuCap.CapObject.Face, 0.2, 0.2);
    basic.pause(20);
});
```

## Try it

1. Power on Robot PU and CogniCap.
2. Hold your face in front of the camera.
3. The robot's head should follow you left/right and up/down.

## Tuning

- If the head is too slow, lower `basic.pause` or increase `pitchSpeedGain` / `yawSpeedGain`.
- If the head jitters, the smoothing inside `head track` already helps; you can also slow the loop rate or reduce the gains.

## Fun face interaction ideas

Add reactions when a face is detected:

```typescript
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    basic.showIcon(IconNames.Happy);
    robotPuPro.leftEyeBright(0.5);
    robotPuPro.rightEyeBright(0.5);
});
```

- Show a **happy face** whenever a face is detected.
- Make the **eyes glow brighter** when someone is close (`object y (mm)` < 300).
- Make the robot **look surprised** (pitch up quickly) when the face disappears.
- Combine `head track` with `on %object detected` to greet people as they come into view.

## Directional voice feedback

Use the face-tracking loop from [Object Tracking](object-tracking.md) and make the robot say where the face is.

When the face is clearly off-centre, the robot speaks a matching phrase. Directional side changes are announced immediately; the centred "hello" phrase is rate-limited by a cooldown.

```typescript
let currentPitch = 0
let currentYaw = 0
let targets: number[] = []
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let lastSay = 0
let sayCooldown = 1500
let lastPhrase = ""
let phrase = ""
let now2 = 0
robotPuCap.startCogniCap()
// turn on face detection only
robotPuCap.enableDetections([robotPuCap.CapObject.Face])
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.10
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.2
billy.voicePreset(BillyVoicePreset.LittleRobot)
// main event loop
basic.forever(function () {
    now2 = input.runningTime()
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
        // Read the current head position and add the offset
        targets = robotPuPro.servoTargets()
        currentYaw = targets[4]
        currentPitch = targets[5]
        // Pick a phrase based on where the face is
        phrase = ""
        if (smoothYaw > 15) {
            phrase = "you are on my right"
        } else if (smoothYaw < -15) {
            phrase = "you are on my left"
        } else if (smoothPitch > 20) {
            phrase = "you are below me"
        } else if (smoothPitch < -20) {
            phrase = "you are above me"
        } else {
            phrase = "hello I see you"
        }
        // Say it only if the phrase changed and either the cooldown passed or the face moved to a new side
        if (phrase != lastPhrase && (now2 - lastSay > sayCooldown || phrase != "hello I see you")) {
            billy.say(phrase)
            lastSay = now2
            lastPhrase = phrase
        }
    }
    // Move head toward the face
    robotPuPro.setMode(robotPuPro.Mode.API)
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)))
    robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)))
    basic.pause(5)
})
```

### Tuning

- `trackGain` (`0.2`) and `trackSpeed` (`0.1`) work the same as in the [Object Tracking](object-tracking.md) tutorial.
- `15` and `20` are the yaw and pitch thresholds for calling the face off-centre. Increase them to reduce chatter; decrease them to react to smaller movements.
- `sayCooldown` (`1500` ms) is the minimum time before the robot will say the centred "hello I see you" phrase. Directional side changes are spoken immediately. Increase it to make the centre greeting less frequent.
- Change the strings in the `if / else` chain to make the robot say whatever you like.

