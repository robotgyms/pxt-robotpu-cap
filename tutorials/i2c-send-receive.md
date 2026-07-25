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

### Message types

| Value | Meaning |
| ---: | --- |
| `0x00` | Idle / alive beacon |
| `0x01` | Face detection |
| `0x02` | Wake detected |
| `0x03` | Voice command placeholder |
| `0x04` | Soccer ball detection |
| `0x05` | Soccer goal detection |

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

```typescript
// Change this to match your ESP32-S3 firmware build.
const ESP32_ADDR = 0x11;
const PACKET_SIZE = 18;

const CAPTURE_CMD = 0x01;
const DETECT_EVERY_CMD = 0x02;

function readPacket(): Buffer {
    return pins.i2cReadBuffer(ESP32_ADDR, PACKET_SIZE, false);
}

function sendCapture(on: boolean) {
    pins.i2cWriteBuffer(ESP32_ADDR, Buffer.fromArray([CAPTURE_CMD, on ? 1 : 0]), false);
}

function sendDetectEvery(frames: number) {
    frames = Math.max(1, Math.min(255, frames));
    pins.i2cWriteBuffer(ESP32_ADDR, Buffer.fromArray([DETECT_EVERY_CMD, frames]), false);
}

function i16(buf: Buffer, offset: number): number {
    let v = buf[offset] | (buf[offset + 1] << 8);
    return v >= 32768 ? v - 65536 : v;
}

function u16(buf: Buffer, offset: number): number {
    return buf[offset] | (buf[offset + 1] << 8);
}

function i8(v: number): number {
    return v >= 128 ? v - 256 : v;
}

function parsePacket(buf: Buffer) {
    if (buf.length != PACKET_SIZE) return;

    let type = buf[0];
    let ver = buf[1];
    let seq = buf[2];
    let flags = buf[3];
    let count = buf[4];
    let confidence = buf[5];
    let x_mm = i16(buf, 6);
    let y_mm = i16(buf, 8);
    let z_mm = i16(buf, 10);
    let w = u16(buf, 12);
    let h = u16(buf, 14);
    let yaw = i8(buf[16]);
    let pitch = i8(buf[17]);

    let valid = (flags & 0x01) != 0;
    let stale = (flags & 0x02) != 0;

    serial.writeLine(
        "type=" + type + " ver=" + ver + " seq=" + seq +
        " valid=" + valid + " stale=" + stale +
        " count=" + count + " conf=" + confidence +
        " x=" + x_mm + " y=" + y_mm + " z=" + z_mm +
        " w=" + w + " h=" + h +
        " yaw=" + yaw + " pitch=" + pitch
    );
}

// Turn on image capture and run face detection on every frame.
sendCapture(true);
sendDetectEvery(1);

basic.forever(function () {
    let packet = readPacket();
    if (packet.length == PACKET_SIZE) {
        parsePacket(packet);
    } else {
        serial.writeLine("i2c read error");
    }
    basic.pause(20);
});
```

## What to check

- `packet.length == 18` before parsing.
- The **valid** flag is set before trusting `x_mm`, `y_mm`, etc.
- The **stale** flag is clear before tracking; if stale, the data is from an old frame.
- `count > 0` means at least one object of that type was detected.

## Tips

- The `seq` number increments each time the ESP32 sends a new packet. A jump means packets were skipped.
- `x_mm` is lateral (positive to the right), `y_mm` is forward distance, `z_mm` is vertical.
- `yaw` and `pitch` are small angular offsets from the camera centerline, useful for head tracking.
