# General Object Tracking with CogniCap

## Goal

Track any object the CogniCap camera can see while keeping the body still. The robot turns its head to keep the object in the centre of the image; the body only balances in place.

## How it works

- Pick the object to track by setting the `target` variable to `robotPuCap.CapObject.Face`, `.Ball`, or `.Goal`.
- Read `object yaw` and `object pitch` for that object.
- Smooth the angles and add them to the current head position.
- Keep the body balanced by calling `robotPuPro.walk(0, 0)` in the same loop.

`robotPuPro.walk(0, 0)` means "balance without moving".

## Blocks used

- `start CogniCap`
- `object detected`
- `object yaw`
- `object pitch`
- `robotPuPro.servoStep`
- `robotPuPro.walk`

## Example

```typescript
let target = robotPuCap.CapObject.Face;

robotPuCap.startCogniCap();

let smoothYaw = 0;
let smoothPitch = 0;

basic.forever(function () {
    // Keep the body balanced without walking
    robotPuPro.walk(0, 0);

    // Track the chosen object if it is visible
    if (robotPuCap.objectDetected(target)) {
        let yaw = robotPuCap.objectYaw(target);
        let pitch = robotPuCap.objectPitch(target);

        // Smooth the measured angles
        smoothYaw = 0.5 * smoothYaw + 0.5 * yaw;
        smoothPitch = 0.5 * smoothPitch + 0.5 * pitch;

        // Read the current head position and add the offset
        let targets = robotPuPro.servoTargets();
        let currentYaw = targets[4];
        let currentPitch = targets[5];

        // Move head toward the object
        robotPuPro.setModeVar(robotPuPro.Mode.API);
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * 0.5, 2);
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * 0.5, 2);
    }

    basic.pause(20);
});
```

## Changing the target

To track a different object, change the first line:

```typescript
let target = robotPuCap.CapObject.Ball;
```

or

```typescript
let target = robotPuCap.CapObject.Goal;
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
- `0.5` in `currentYaw + smoothYaw * 0.5` reduces overshoot. Increase if the head is too slow.
- `2` step size for `servoStep`: smaller is slower/smooth, larger is faster.
- `robotPuPro.walk(0, 0)` keeps the balance loop running without moving the feet.
