# I2C Packet Format

## Goal

Understand the 18-byte I2C packet that CogniCap sends to the micro:bit.

## Packet layout

Every packet from the CogniCap ESP32-S3 is exactly 18 bytes:

| Byte(s) | Field   | Meaning                                                                 |
|---------|---------|-------------------------------------------------------------------------|
| 0       | `type`  | Message type: `0x00-0x0F` status/device, `0x10-0x1F` voice/audio, `0x20-0xFF` vision/detection |
| 1       | `ver`   | Protocol version                                                        |
| 2       | `seq`   | Sequence counter (increments on every packet)                           |
| 3       | `flags` | Valid/stale/capture/web/sleep flags                                     |
| 4       | `count` | Count or action token                                                   |
| 5       | `score` | Confidence or status byte                                               |
| 6-7     | `x_mm`  | Signed 16-bit X position in millimetres                                 |
| 8-9     | `y_mm`  | Signed 16-bit Y position in millimetres                                 |
| 10-11   | `z_mm`  | Signed 16-bit Z position in millimetres                                 |
| 12-13   | `w`     | Object width in pixels                                                  |
| 14-15   | `h`     | Object height in pixels                                                 |
| 16      | `yaw`   | Signed yaw angle in degrees                                             |
| 17      | `pitch` | Signed pitch angle in degrees                                           |

## Type segments

- `0x00-0x0F`: Status, device, and action messages (`EVT_IDLE`, `EVT_ACTION`, `EVT_WIFI`, `EVT_WEBSITE`, `EVT_CAMERA`, `EVT_POWER`, `EVT_ROBOT`)
- `0x10-0x1F`: Voice and audio messages (`EVT_VOICE`, `EVT_WAKE`)
- `0x20-0xFF`: Vision and detection messages (`EVT_FACE`, `EVT_SOCCER_BALL`, `EVT_SOCCER_GOAL`)

For status, voice, and action packets the `x_mm`, `y_mm`, `z_mm`, width, height, yaw, and pitch fields are not used; `count` holds the action token or event count.

## Try it

Use the `print i2c packet` block to watch packets arrive in the MakeCode serial console:

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.printI2CPacket();
    basic.pause(200);
});
```

## See also

- [I2C Send and Receive](i2c-send-receive.md) — command the camera and parse packets in your own code.
