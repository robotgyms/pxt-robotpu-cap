# General Object Following with CogniCap

## Goal

Make Robot PU follow a chosen CogniCap object and stop at a target distance.

## How it works

This program is the same logic as `robotPuCap.followObject()`, written out so every step can be tweaked:

1. `robotPuCap.startCogniCap()` starts the camera.
2. `robotPuCap.enableDetections([...])` turns off the other detectors so the ESP32-S3 only runs the one you want to follow.
3. When the object is visible, `objectYaw(...)` and `objectPitch(...)` give the angle and `objectY(...)` gives the forward distance in mm that `followObject` uses.
4. The yaw and pitch are smoothed with `0.5 * old + 0.5 * new`.
5. `robotPuPro.servoTargets()` reads the head position, then `servoStep(...)` adds the smoothed angle to point the head at the object.
6. `followSpeed` is the distance error clamped to `-6..6`.
7. `followTurn` is a running average of the clamped yaw-turn command.
8. If the object is lost briefly, `followSpeed`, `followTurn`, and the smoothed angles decay by the `decay` multiplier for up to `lostTimeout` ms.
9. `robotPuPro.setServoTrim(HeadPitch, smoothPitch * 0.1)` fine-tunes the head pitch.
10. `robotPuPro.walk(followSpeed, followTurn)` moves the robot, and `searchForObject` scans the head while the object is missing.

The robot stops roughly `distance` millimetres from the object. A larger `distance` stops farther away; a smaller `distance` lets it get closer.

## Blocks used

- `start CogniCap`
- `enableDetections` (TypeScript function)
- `object detected`
- `object yaw`
- `object pitch`
- `object y (mm)`
- `set mode`
- `servoTargets`
- `servoStep`
- `left eye bright`
- `right eye bright`
- `set servo trim`
- `walk`
- `search for %object`

## Example

```typescript
let followTurn = 0
let followSpeed = 0
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let followLastTime = 0
let now = 0
let currentYaw = 0
let currentPitch = 0
let targets: number[] = []
let distance = 150
let speedGain = 0.4
let turnGain = -0.07
let decay = 0.9
let lostTimeout = 5000
let headGain = 0.08
let headSpeed = 8
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])
robotPuPro.setServoTrim(robotPuPro.ServoJoint.LeftFoot, -5)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.RightFoot, -5)
robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadYaw, -8)
basic.forever(function () {
    now = input.runningTime()
    // followTurn = 0
    // smoothYaw = 0
    // smoothPitch = 0
    // robotPuCap.searchForObject(robotPuCap.CapObject.Ball)
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        followLastTime = now
        yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Ball)
        pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Ball)
        smoothYaw = 0.9 * smoothYaw + 0.1 * yaw
        smoothPitch = 0.9 * smoothPitch + 0.1 * pitch
        robotPuPro.leftEyeBright(0.01)
        robotPuPro.rightEyeBright(0.01)
        followSpeed = Math.max(-6, Math.min(6, (robotPuCap.objectY(robotPuCap.CapObject.Ball) - distance) * speedGain))
        followTurn = 0.8 * followTurn + 0.2 * Math.max(-1, Math.min(1, smoothYaw * turnGain))
    } else if (now - followLastTime < lostTimeout) {
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        followSpeed = followSpeed * decay
        followTurn = followTurn * decay
    } else if (now - followLastTime < 1.5 * lostTimeout) {
        // back up, hopefuly to find the object again
        followSpeed = -2
    } else {
        // lost the sight of object, stop
        followSpeed = 0
    }
    serial.writeLine("headTrim:" + smoothPitch * 0.1)
    robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, smoothPitch + 5)
    robotPuPro.walkDo(followSpeed, followTurn)
    basic.pause(5)
})

```

Replace `CapObject.Ball` with `CapObject.Face` or `CapObject.Goal` to follow a different object.

## Tuning

- `distance` (150 in the example) is the target stop distance in mm.
- `speedGain` (0.4) controls how fast the robot moves toward the object. It must be between 0.001 and 2.
- `turnGain` (-0.2) controls how sharply it turns to keep the object centred. It must be between -1 and 1. Make it less negative if the robot wobbles.
- `decay` (0.7) is the follow-through multiplier while the object is briefly out of view. It must be between 0.001 and 1. Closer to 1 keeps the robot moving longer; closer to 0 stops it sooner.
- `lostTimeout` (6000) is how long the robot keeps decaying before fully stopping after losing the object.
- `headGain` (0.08) is how much the head turns per degree of object error. Increase for a faster head response; too high overshoots.
- `headSpeed` (8) is the servo step duration in ms. Smaller is snappier; too small can jitter.
- `0.5` smoothing weight: closer to `1.0` follows faster but may jitter; closer to `0.0` is smoother but slower.
- If the object is lost, `search for %object` scans the head while `robotPuPro.walk(followSpeed, followTurn)` decays to a stop.
