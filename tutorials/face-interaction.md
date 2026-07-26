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
