# CogniCap Setup

## What you need

- BBC micro:bit V2
- Robot PU (powered on)
- CogniCap smart hat (ESP32-S3 camera + I2C mux)

## Goal

Start the CogniCap pipeline and verify that the camera is sending detection packets over I2C.

## Blocks used

- `start CogniCap`
- `face detected` / `ball detected` / `goal detected`
- `object x (mm)` / `object y (mm)`

## Steps

1. Open [MakeCode for micro:bit](https://makecode.microbit.org).
2. Add the **CogniCap for Robot PU** extension.
3. In `on start`, call `robotPuCap.startCogniCap()`.
4. In a `basic.forever` loop, check `objectDetected` and show the object's x position.
5. Flash the program to the micro:bit.

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        basic.showNumber(robotPuCap.objectX(robotPuCap.CapObject.Face));
    } else if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        basic.showNumber(robotPuCap.objectY(robotPuCap.CapObject.Ball));
    } else {
        basic.showIcon(IconNames.No);
    }
    basic.pause(100);
});
```

## Tips

- Wait about 2 seconds after power-on for the ESP32-S3 to boot.
- `start CogniCap` automatically re-enables services if the camera reboots.
- You can toggle individual services with `enable <face/ball/goal> detection <true/false>`.
