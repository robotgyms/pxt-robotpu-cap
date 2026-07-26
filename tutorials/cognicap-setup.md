# CogniCap Setup

## What you need

- BBC micro:bit V2
- Robot PU (powered on)
- CogniCap smart hat (ESP32-S3 + OV5640 camera + I2C mux + microphone)

## Goal

Connect to CogniCap and check that it is working. This means powering on the hat, connecting to its Wi-Fi access point, viewing the live camera feed, and verifying that detection packets arrive on the micro:bit.

## Hardware setup

1. Mount the CogniCap smart hat on top of the micro:bit.
2. Connect the Camera and micro:bit to Robot PU's I2C hub/breakout.
3. Make sure the robot's battery is on and the camera LED is visible during boot.
4. Wait about 2 seconds after power-on for the ESP32-S3 to start.

## Software setup

1. Open [MakeCode for micro:bit](https://makecode.microbit.org).
2. Create a new project.
3. Add the **pxt-robotpu-cap** extension (search for `robotgyms/pxt-robotpu-cap` or the CogniCap extension).
4. You do not need any extra I2C setup code — `start CogniCap` opens the I2C mux and starts polling automatically.

## Connect to CogniCap Wi-Fi

The CogniCap hat can create its own Wi-Fi access point for debugging and for viewing the camera feed.

1. On your phone or computer, open the Wi-Fi settings.
2. Connect to the CogniCap network. The SSID and password are usually printed on the CogniCap hat label.
3. Open a web browser and go to `http://192.169.4.1`.
4. The webpage will show:
   - A live camera image stream.
   - Current detection status (face, ball, goal, etc.).
   - Recent event messages from the ESP32-S3.

## Blocks used

- `start CogniCap`
- `enable %object detection %enabled`
- `%object detected`
- `%object x (mm)` / `%object y (mm)`
- `print i2c packet`

## Quick test

This program starts CogniCap, enables face detection, and shows a happy face when a face is detected. It also prints every I2C packet to the serial console so you can verify packets are arriving.

```typescript
robotPuCap.startCogniCap();
robotPuCap.enableDetection(robotPuCap.CapObject.Face, true);

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
        basic.showIcon(IconNames.Happy);
    } else {
        basic.showIcon(IconNames.No);
    }
    robotPuCap.printI2CPacket();
    basic.pause(200);
});
```

## What you should see

- On the micro:bit display: the `No` icon most of the time, and a `Happy` icon when a face is in front of the camera.
- In the MakeCode serial console: packets printed every 200 ms, for example:
  - `tok type=0 ver=1 seq=5 flags=0 token=0 score=0` (idle/status packets)
  - `obj type=32 ver=1 seq=12 flags=1 count=1 score=80 x_mm=20 ... yaw=5 pitch=-2` (face detection, `0x20` is `EVT_FACE`)

## Tips

- `start CogniCap` automatically re-enables services if the camera reboots.
- You can toggle individual services with `enable <face/ball/goal> detection <true/false>`.
- If nothing is printed, check the I2C cable and power to the CogniCap hat.
