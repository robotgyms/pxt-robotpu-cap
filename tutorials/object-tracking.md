# General Object Tracking with CogniCap

## Goal

Track any object the CogniCap camera can see while keeping the body still. The robot turns its head to keep the object in the centre of the image; the body only balances in place.

## How it works

- `robotPuCap.startCogniCap()` starts the camera.
- `basic.forever` runs the loop about 200 times per second (`basic.pause(5)`).
- `objectDetected(robotPuCap.CapObject.Face)` checks whether a face is in view.
- When a face is seen, `robotPuPro.blink(1)` lights the eyes and `objectYaw` / `objectPitch` give the angle to the object.
- `smoothYaw` / `smoothPitch` filter the readings: `0.5 * old + 0.5 * new`. A bigger old weight is smoother but slower; a bigger new weight reacts faster but may jitter.
- `robotPuPro.servoTargets()` returns the current servo positions; index `4` is head yaw and `5` is head pitch.
- `trackGain` scales the angle into a target offset for the head.
- `trackSpeed` turns the size of the angle into a servo step duration, so the head moves faster when the error is large (`Math.max(0.5, Math.abs(smoothYaw * trackSpeed))`).
- `robotPuPro.setMode(robotPuPro.Mode.API)` puts the servos under API control before moving them.
- If the object stays lost for `lostTimeout` ms, the tracked angle decays toward zero and the robot eventually `stand`s and blinks brighter to search.

## Blocks used

- `start CogniCap`
- `object detected`
- `object yaw`
- `object pitch`
- `set mode`
- `servoTargets`
- `servoStep`
- `blink`

## Example

```typescript
let currentPitch = 0
let currentYaw = 0
let targets: number[] = []
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let lostTimeout = 1000
let now = 0
let followLastTime = 0
let decay = 0.7

robotPuCap.startCogniCap()
// tweak it for tracking speed, high value will cause oscillation
let trackSpeed = 0.3
// tweak it for accelration speed, high value will cause oscillation
let trackGain = 0.4
// main event loop
basic.forever(function () {
    now = input.runningTime()
    // Track the chosen object if it is visible
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        followLastTime = now
        // soft light of eyes, and look at you
        robotPuPro.blink(1)
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
        serial.writeLine("yaw:"+smoothYaw)
        serial.writeLine("pitch:"+smoothPitch)
    } else if (now - followLastTime < lostTimeout) {
        // follow through
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        // eyes brighter
        robotPuPro.blink(2)
    } else if (now - followLastTime < 2*lostTimeout) {
        smoothYaw = 0
        smoothPitch = 0
        // eyes much brighter
        robotPuPro.blink(3)
    } else {
        robotPuPro.stand()
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

- `0.5` smoothing weight: give the `old` value more weight for smoother, slower motion; give the `new` value more weight for faster, jitterier motion.
- `trackGain` (`0.4`): scales how far the head turns toward the object. Increase for faster tracking; too high will cause overshoot or oscillation.
- `trackSpeed` (`0.3`): scales the servo step duration, so larger angles move faster. Increase for snappier motion; too high will cause oscillation.
- The `Math.max(0.5, ...)` guard ensures the servo step duration never drops below 0.5 ms, avoiding jerky jumps.
