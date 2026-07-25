# Face Tracking with CogniCap

## Goal

Keep Robot PU's head pointed at a person's face.

## How it works

The `track face` block reads the face yaw and pitch from the latest I2C packet, then moves the head yaw and pitch servos toward the face. It uses a small smoothing filter so the motion is steady.

## Blocks used

- `start CogniCap`
- `track face`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.trackFace();
    basic.pause(20);
});
```

## Try it

1. Power on Robot PU and CogniCap.
2. Hold your face in front of the camera.
3. The robot's head should follow you left/right and up/down.

## Tuning

- If the head is too slow, lower the `basic.pause` value.
- If the head jitters, the smoothing inside `track face` already helps; you can also slow the loop rate.
