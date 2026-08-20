# General Object Following with CogniCap

## Goal

Make Robot PU follow a chosen CogniCap object and stop at a target distance.

## How it works

This program is the same logic as `robotPuCap.followObject()`, written out so every step can be tweaked:

1. `robotPuCap.startCogniCap()` starts the camera.
2. `robotPuCap.enableDetections([...])` turns off the other detectors so the ESP32-S3 only runs the one you want to follow.
3. When the object is visible, `objectYaw(...)` gives the horizontal angle, `objectPitch(...)` gives the vertical angle, and `objectY(...)` gives the forward distance estimate that `followObject` uses.
4. `smoothYaw` and `smoothPitch` are filtered with `0.9 * old + 0.1 * new`; `followTurn` is filtered with `0.8 * old + 0.2 * new`.
5. `followSpeed` is the difference between `objectY` and `distance`, clamped to `-6..6`.
6. `followTurn` is the clamped `smoothYaw * turnGain`, smoothed with `0.8 * old + 0.2 * new`.
7. If the object is lost briefly, `followSpeed`, `followTurn`, and the smoothed angles decay by the `decay` multiplier for up to `lostTimeout` ms.
8. Between `lostTimeout` and `1.5 * lostTimeout`, the robot backs up slowly (`followSpeed = -2`) to try to reacquire the object.
9. After `1.5 * lostTimeout`, it calls `robotPuPro.explore()` to actively search for the object.
10. `robotPuPro.setServoTrim(HeadPitch, smoothPitch + 10)` tilts the head to follow the object's vertical angle.
11. `robotPuPro.walkDo(followSpeed, followTurn)` moves the robot. To scan while searching, uncomment the `searchForObject(...)` line in the loop.

The robot stops roughly `distance` millimetres from the object. A larger `distance` stops farther away; a smaller `distance` lets it get closer.

## Blocks used

- `start CogniCap`
- `enableDetections`
- `object detected`
- `object yaw`
- `object pitch`
- `object y`
- `left eye bright`
- `right eye bright`
- `set servo trim`
- `walkDo`
- `explore`

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
let targets: number[] = []
let currentPitch = 0
let currentYaw = 0
let distance = 150
let speedGain = 0.4
let turnGain = -0.07
let decay = 0.9
let lostTimeout = 5000
let headGain = 0.08
let headSpeed = 8
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])
robotPuPro.setServoTrim(0, 0)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, 5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)
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
        // lost the sight of object, explore
        robotPuPro.explore()
    }
    // serial.writeLine("headTrim:" + smoothPitch * 0.1)
    robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, smoothPitch + 10)
    robotPuPro.walkDo(followSpeed, followTurn)
    basic.pause(5)
})


```

Replace `CapObject.Ball` with `CapObject.Face` or `CapObject.Goal` to follow a different object.

## Tuning

- `distance` (150 in the example) is the target stop distance in mm.
- `speedGain` (0.4) controls how fast the robot moves toward the object. It must be between 0.001 and 2.
- `turnGain` (-0.07) controls how sharply it turns to keep the object centred. It must be between -1 and 1. Make it less negative if the robot wobbles.
- `decay` (0.9) is the follow-through multiplier while the object is briefly out of view. It must be between 0.001 and 1. Closer to 1 keeps the robot moving longer; closer to 0 stops it sooner.
- `lostTimeout` (5000) is how long the robot keeps decaying before backing up after losing the object.
- `0.9`/`0.1` yaw/pitch smoothing: give the `old` value more weight for smoother, slower motion; give the `new` value more weight for faster, jitterier motion.
- `0.8`/`0.2` `followTurn` smoothing: same idea for the turn command.
- To scan while searching for the object, you can uncomment the `searchForObject(...)` line in the loop, or let the `explore()` fallback run after the object has been lost for longer than `1.5 * lostTimeout`.
