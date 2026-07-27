# General Object Tracking with CogniCap

## Goal

Track any object the CogniCap camera can see while keeping the body still. The robot turns its head to keep the object in the centre of the image; the body only balances in place.

## How it works

- `robotPuCap.startCogniCap()` starts the camera.
- `basic.forever` runs the loop about 100 times per second (`basic.pause(10)`).
- `objectDetected(robotPuCap.CapObject.Face)` checks whether a face is in view.
- When a face is seen, the eyes light up and `objectYaw` / `objectPitch` give the angle to the object.
- `smoothYaw` / `smoothPitch` filter the readings: `0.5 * old + 0.5 * new`. A bigger old weight is smoother but slower; a bigger new weight reacts faster but may jitter.
- `robotPuPro.servoTargets()` returns the current servo positions; index `4` is head yaw and `5` is head pitch.
- `trackGain` scales the angle into a target offset for the head.
- `trackSpeed` turns the size of the angle into a servo step duration, so the head moves faster when the error is large (`Math.max(0.5, Math.abs(smoothYaw * trackSpeed))`).
- `setModeVar(robotPuPro.Mode.API)` puts the servos under API control before moving them.

## Blocks used

- `start CogniCap`
- `object detected`
- `object yaw`
- `object pitch`
- `set mode`
- `servoTargets`
- `servoStep`
- `left eye bright`
- `right eye bright`

## Example

```typescript
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let followLastTime = 0
let now = 0
let targets: number[] = []
let currentPitch = 0
let currentYaw = 0
let followSpeed = 0
let followTurn = 0
let distance = 150
let speedGain = 0.4
let turnGain = -0.05
let decay = 0.76
let lostTimeout = 3000
let headGain = 0.08
let headSpeed = 8
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])
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
    } else {
        // back up to avoid overshooting
        followSpeed = -2
    }
    serial.writeLine("headTrim:" + smoothPitch * 0.1)
    robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, smoothPitch + 5)
    robotPuPro.walkDo(followSpeed, followTurn)
    basic.pause(5)
})

```

## Changing the target

To track a different object, replace every `robotPuCap.CapObject.Face` with `robotPuCap.CapObject.Ball` or `robotPuCap.CapObject.Goal` in the `if` and the `objectYaw` / `objectPitch` calls:

```typescript
if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
    yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Ball)
    pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Ball)
}
```

or

```typescript
if (robotPuCap.objectDetected(robotPuCap.CapObject.Goal)) {
    yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Goal)
    pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Goal)
}
```

## Adding more objects later

When the camera learns new objects, you can add them to the `CapObject` enum in `main.ts` and use the same pattern:

```typescript
if (robotPuCap.objectDetected(robotPuCap.CapObject.YourNewObject)) {
    // track it
}
```

## Tuning

- `0.5` smoothing weight: closer to `1.0` follows faster but may jitter; closer to `0.0` is smoother but slower.
- `trackGain` (`0.2`): scales how far the head turns toward the object. Increase for faster tracking; too high will cause overshoot or oscillation.
- `trackSpeed` (`0.16`): scales the servo step duration, so larger angles move faster. Increase for snappier motion; too high will cause oscillation.
- The `Math.max(0.5, ...)` guard ensures the servo step duration never drops below 0.5 ms, avoiding jerky jumps.
