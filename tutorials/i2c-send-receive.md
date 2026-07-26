# Sending and Receiving I2C Messages

This tutorial is based on the RobotEU I2C communication protocol used between the micro:bit and the ESP32-S3 camera board.

## Goal

Send commands to the ESP32-S3 camera and read the 18-byte detection packets it returns over I2C.

## Hardware wiring (accessory mode)

| micro:bit | ESP32-S3 |
| --- | --- |
| P19 (SCL) | GPIO40 (SCL) |
| P20 (SDA) | GPIO39 (SDA) |
| GND | GND |

## I2C address

The default ESP32-S3 accessory-mode I2C address is `0x11`. If you built the firmware with a different address, change the `ESP32_ADDR` constant in the code below. The main `CogniCap` class in this extension uses `0x42` (66) because that is how the matching firmware is configured; the protocol is the same regardless of address.

## Protocol overview

The ESP32-S3 acts as an I2C slave and the micro:bit is the master.

### Incoming 18-byte packet layout

| Offset | Size | Field |
| --- | ---: | --- |
| `0` | 1 | Message type |
| `1` | 1 | Protocol version (currently `1`) |
| `2` | 1 | Sequence number |
| `3` | 1 | Flags |
| `4-17` | 14 | Payload |

### Message type segments

The parser uses the high nibble of the type byte to pick one of three layouts:

| Range | Segment | Payload use |
| ---: | --- | --- |
| `0x00-0x0F` | Status / action | `count` is a token or status code, bytes 6-17 reserved |
| `0x10-0x1F` | Voice / audio | `count` is command ID or wake count, bytes 6-17 reserved |
| `0x20-0xFF` | Vision / detection | full 14-byte payload with `x_mm`, `y_mm`, `z_mm`, `w`, `h`, `yaw`, `pitch` |

### Current type values

| Value | Meaning |
| ---: | --- |
| `0x00` | Idle / status |
| `0x01` | Action / command token (token in `count`) |
| `0x10` | Voice command (action token in `count`) |
| `0x11` | Wake detected |
| `0x20` | Face detection |
| `0x21` | Soccer ball detection |
| `0x22` | Soccer goal detection |

### Status flags

| Bit | Meaning |
| ---: | --- |
| `0` | Payload is valid |
| `1` | Data is stale; do not track from this packet |
| `2` | Image capture is enabled |
| `3` | Web server is enabled |
| `4` | Sleep mode is enabled |

### Outgoing commands

The micro:bit can write small command buffers to the ESP32-S3:

| Buffer | Meaning |
| --- | --- |
| `[0x01, 0x00]` | Turn image capture off |
| `[0x01, 0x01]` | Turn image capture on |
| `[0x02, N]` | Run face detection every `N` captured frames |

## MakeCode / TypeScript example

`main.ts` already implements the I2C parsing and service management, so use the exposed `robotPuCap` blocks instead of re-implementing `pins.i2cReadBuffer`.

```typescript
robotPuCap.startCogniCap();

// React to a detected face and read the parsed fields.
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    serial.writeLine(
        "face x=" + robotPuCap.lastObjectX() +
        " y=" + robotPuCap.lastObjectY() +
        " count=" + robotPuCap.lastObjectCount()
    );
});

// React to a specific voice command.
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Go, function () {
    serial.writeLine("voice: go");
});

// Inspect the latest action token.
basic.forever(function () {
    let token = robotPuCap.lastActionToken();
    if (token > 0) {
        serial.writeLine("last action token=" + token);
    }
    basic.pause(500);
});

// React to any I2C message type directly.
robotPuCap.onI2CMessage(0x20, function () {
    serial.writeLine("got raw message type 0x20 (face)");
});
```

`start CogniCap` opens the TCA9546A mux and begins polling the ESP32-S3. To toggle a service at runtime, use `enable <face/ball/goal> detection` or `enable voice commands`.

## What to check

- Use `last object valid` or `last object count` before trusting object-position accessors.
- Object fields (`last object x`, `last object y`, `last object yaw`, etc.) are meaningful only for vision packets (`0x20`, `0x21`, `0x22` and any future `0x20+` type).
- For action/voice packets (`0x01`, `0x10`), `last action token` returns the token stored in `count`.
- The extension deduplicates repeated `seq` numbers for voice and wake packets, so callbacks fire once per command.

## Tips

- The `seq` number increments each time the ESP32 sends a new packet. A jump means packets were skipped.
- `x_mm` is lateral (positive to the right), `y_mm` is forward distance, `z_mm` is vertical.
- `yaw` and `pitch` are small angular offsets from the camera centerline, useful for head tracking.
