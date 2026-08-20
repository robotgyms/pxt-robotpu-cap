# CogniCap I2C Protocol Specification

This document describes the I2C message protocol between the **CogniCap ESP32-S3** and the **BBC micro:bit V2** running the `pxt-robotpu-cap` extension. The ESP32-S3 is the packet generator and parser for the control channel; the micro:bit is the consumer of vision/audio/status packets and the sender of service-enable commands.

> **Goal**: both sides should implement the same constants, packet layout, and type segments. Because the ESP32-S3 firmware is C++ and the micro:bit side is TypeScript, the constants and structure are reproduced here for the C++ implementation.

## 1. I2C Bus Layout

- **I2C multiplexer (TCA9546A)**: `MUX_ADDR = 0x70` (decimal `112`)
  - The micro:bit opens all 4 mux channels at startup with one write of `0x0F`.
- **CogniCap / ESP32-S3**: `ESP32_ADDR = 0x42` (decimal `66`)
- **Packet size**: exactly **18 bytes** for every transfer.

## 2. Packet Layout

All 18-byte packets use little-endian multi-byte fields.

| Byte(s) | Field  | Type / Size                         | Notes                                                              |
|---------|--------|-------------------------------------|--------------------------------------------------------------------|
| 0       | `type` | `uint8`                             | Message type segment (see §3)                                      |
| 1       | `ver`  | `uint8`                             | Protocol version; currently expected to be `1`                     |
| 2       | `seq`  | `uint8`                             | Sequence counter; increment on every packet sent                   |
| 3       | `flags`| `uint8`                             | Bitfield (see §4)                                                  |
| 4       | `count`| `uint8`                             | Number of detections, action token, or wake count                  |
| 5       | `score`| `uint8`                             | Confidence / status byte (`0..255`)                                |
| 6-7     | `x_mm` | `int16`  little-endian              | X position in millimetres; only valid for `type >= 0x20`           |
| 8-9     | `y_mm` | `int16`  little-endian              | Y position in millimetres; only valid for `type >= 0x20`           |
| 10-11   | `z_mm` | `int16`  little-endian              | Z position in millimetres; only valid for `type >= 0x20`           |
| 12-13   | `w`    | `uint16` little-endian              | Bounding-box width in pixels; only valid for `type >= 0x20`        |
| 14-15   | `h`    | `uint16` little-endian              | Bounding-box height in pixels; only valid for `type >= 0x20`       |
| 16      | `yaw`  | `int8`                              | Signed yaw in degrees; only valid for `type >= 0x20`               |
| 17      | `pitch`| `int8`                              | Signed pitch in degrees; only valid for `type >= 0x20`             |

For packets where `type < 0x20` the ESP32 must still send all 18 bytes; bytes 6-17 should be zeroed so the micro:bit parser safely ignores them.

### C++ reference struct

```cpp
struct CogniCapPacket {
    uint8_t  type;
    uint8_t  ver;
    uint8_t  seq;
    uint8_t  flags;
    uint8_t  count;
    uint8_t  score;
    int16_t  x_mm;    // signed, little-endian
    int16_t  y_mm;    // signed, little-endian
    int16_t  z_mm;    // signed, little-endian
    uint16_t w;       // little-endian
    uint16_t h;       // little-endian
    int8_t   yaw;
    int8_t   pitch;
};
static_assert(sizeof(CogniCapPacket) == 18, "Packet must be 18 bytes");
```

## 3. Message Type Segments

The type byte is split into three contiguous segments. This lets the micro:bit use a single parser for all vision objects and route callbacks by segment.

### 3.1 Status / action / device (`0x00-0x0F`)

| Constant     | Value  | Meaning                                                                 |
|--------------|--------|-------------------------------------------------------------------------|
| `EVT_IDLE`   | `0x00` | No event; heartbeat/status                                              |
| `EVT_ACTION` | `0x01` | Generic action token in `count`                                         |
| `EVT_WIFI`   | `0x02` | Wi-Fi status / AP state in `score`                                      |
| `EVT_WEBSITE`| `0x03` | Web server / captive-portal state                                       |
| `EVT_CAMERA` | `0x04` | Camera module status (`score` = 0/1 for off/on)                         |
| `EVT_POWER`  | `0x04` | Alias for `EVT_CAMERA`; power/camera status                             |
| `EVT_ROBOT`  | `0x05` | Robot PU status / robot mode feedback                                   |

> **Note**: `0x04` is intentionally shared between `EVT_CAMERA` and `EVT_POWER`. The micro:bit treats both as the camera/power service key.

For these packets `x_mm..pitch` are zero. `count` holds the action token or a status-specific counter; `score` holds a status byte or confidence.

### 3.2 Voice / audio (`0x10-0x1F`)

| Constant    | Value  | Meaning                                                                 |
|-------------|--------|-------------------------------------------------------------------------|
| `EVT_VOICE` | `0x10` | MultiNet voice command recognised; `count` = `VoiceAction` token        |
| `EVT_WAKE`  | `0x11` | WakeNet wake-word triggered; `count` = number of wake events            |

`count` is the action token for `EVT_VOICE` and is also used to dispatch the matching `on voice action %action` handler on the micro:bit.

### 3.3 Vision / detection (`0x20-0xFF`)

| Constant          | Value  | Meaning                                              |
|-------------------|--------|------------------------------------------------------|
| `EVT_FACE`        | `0x20` | Face detection; populate all object fields           |
| `EVT_SOCCER_BALL` | `0x21` | Soccer ball detection                                |
| `EVT_SOCCER_GOAL` | `0x22` | Soccer goal detection                                |

Any `type >= 0x20` is parsed as a vision packet. New objects can be added by allocating a new byte in this range **without** changing the micro:bit parser.

## 4. Packet Flags

| Bit  | Constant    | Meaning                                                                |
|------|-------------|------------------------------------------------------------------------|
| 0    | `VALID`     | `1 << 0` — Packet contents are valid and may be used.                  |
| 1    | `STALE`     | `1 << 1` — Data is old; the micro:bit will not treat it as fresh.      |
| 2    | `CAPTURE`   | `1 << 2` — Single-frame capture was requested (debug feature).         |
| 3    | `WEB`       | `1 << 3` — Web/captive-portal activity flag.                           |
| 4    | `SLEEP`     | `1 << 4` — Low-power/sleep state active.                               |

Freshness on the micro:bit is computed as:

```text
fresh = (flags & VALID) && !(flags & STALE)
```

The ESP32-S3 should always set `VALID` when the packet contains a genuine new frame or event, and set `STALE` when the underlying data has not been refreshed (e.g. no new camera frame since the last poll).

## 5. Action Tokens

The micro:bit uses `count` as an action token whenever `isActionToken(type)` is true (`type == EVT_ACTION` or `type == EVT_VOICE`). The token value is used to look up the registered callback (`actionHandlers[token]`). The ESP32 must use the exact numeric values below for voice commands.

### 5.1 `VoiceAction` token values

| Token name  | Value  | Block label     |
|-------------|--------|-----------------|
| `Rest`      | `1`    | rest            |
| `Go`        | `2`    | go              |
| `Back`      | `3`    | back            |
| `Stop`      | `4`    | stop            |
| `Jump`      | `5`    | jump            |
| `Kick`      | `6`    | kick            |
| `Sing`      | `7`    | sing            |
| `Talk`      | `8`    | talk            |
| `Dance`     | `9`    | dance           |
| `Left`      | `10`   | left            |
| `Right`     | `11`   | right           |
| `Straight`  | `12`   | straight        |
| `Wakeup`    | `13`   | wakeup          |

### 5.2 `QAction` high-level action values (for reference)

These are used on the micro:bit side when it dispatches an `attention action`. The ESP32 does **not** need to emit these unless it also generates `EVT_ACTION` packets.

| Token name  | Value  |
|-------------|--------|
| `Rest`      | `0`    |
| `Walk`      | `1`    |
| `TurnLeft`  | `2`    |
| `TurnRight` | `3`    |
| `Dance`     | `4`    |
| `Kick`      | `5`    |
| `Search`    | `6`    |
| `Approach`  | `7`    |

## 6. Service Enable Protocol

The micro:bit sends a 3-byte I2C write to `ESP32_ADDR` to turn a service on or off.

```text
[ CMD_SERVICE_ENABLE, type, on_off ]
```

| Byte | Value                           | Meaning                                              |
|------|---------------------------------|------------------------------------------------------|
| 0    | `CMD_SERVICE_ENABLE = 0x08`     | Service-enable command                               |
| 1    | `type`                          | The message type / service key to enable/disable     |
| 2    | `1` for on, `0` for off         | New service state                                    |

The micro:bit treats the message type as the service key. `type` is therefore one of:

- `EVT_WIFI` (`0x02`)
- `EVT_CAMERA` / `EVT_POWER` (`0x04`)
- `EVT_VOICE` (`0x10`)
- `EVT_FACE` (`0x20`)
- `EVT_SOCCER_BALL` (`0x21`)
- `EVT_SOCCER_GOAL` (`0x22`)

### Micro:bit service keeper

`start CogniCap` starts a background loop that periodically re-sends `CMD_SERVICE_ENABLE` for every known service whose `serviceStatus[type] != SVC_OFF`. The loop sends each enable command every few milliseconds and then waits **30 seconds** before restarting the list. This ensures that a camera reboot does not permanently disable services.

| Constant      | Value  | Meaning                                           |
|---------------|--------|---------------------------------------------------|
| `SVC_OFF`     | `0`    | Service is intentionally turned off               |
| `SVC_ON`      | `1`    | Service is on / requested                         |
| `SVC_ERR`     | `2`    | Service error / unavailable                       |

The ESP32-S3 must accept `CMD_SERVICE_ENABLE`, update an internal service state table keyed by `type`, and start/stop the corresponding pipeline (e.g. camera, detector, wake-word, MultiNet, Wi-Fi AP, web server).

## 7. Object Coordinates and Angles

For vision packets (`type >= 0x20`) the ESP32 must fill the following fields:

- `x_mm`, `y_mm`, `z_mm`: signed 16-bit distances in millimetres from the camera optical centre. `x` is positive to the right, `y` is positive downward, `z` is positive forward (distance into the scene).
- `w`, `h`: unsigned 16-bit bounding box width and height in pixels.
- `yaw`: signed 8-bit head yaw in degrees. `0` = straight ahead, positive = object is to the robot's right.
- `pitch`: signed 8-bit head pitch in degrees. `0` = level, positive = object is above the robot.

These values are used directly by `headTrackObject` and `followObject` on the micro:bit.

## 8. Detection Freshness and Count

`objectDetected(object)` on the micro:bit returns `true` only when:

```text
packet.type == object  &&  packet.count > 0  &&  packet.fresh
```

The ESP32 should set `count > 0` whenever the object is detected in the current frame. `count` may be the number of instances detected. If the object is not present, send the packet with `count = 0` and optionally `flags = STALE`, or skip sending that type until it reappears. The service keeper on the micro:bit side does not depend on receiving every type; it depends on valid packets for enabled services.

## 9. Sequence and Deduplication

The micro:bit uses the `seq` byte to update attention counters per type and to deduplicate event callbacks for non-vision types:

- For attention bookkeeping it stores `attLastPacketSeq[type]` and only increments `attFaceCount` / `attVoiceCount` when `seq` changes.
- For `type < 0x20` and `type != EVT_IDLE` it stores `lastEventSeq[type]` and only dispatches callbacks when `seq` changes.

The ESP32 must increment `seq` for every packet it sends. The sequence counter can wrap around from `255` to `0`; the micro:bit only compares for equality.

## 10. Recommended Debug Output

For quick compatibility tests the micro:bit prints packets in two formats. Matching these formats in ESP32 logs makes side-by-side debugging easier.

### Non-vision / token packet (`type < 0x20`)

```text
tok type=<type> ver=<ver> seq=<seq> flags=<flags> token=<count> score=<score>
```

### Vision packet (`type >= 0x20`)

```text
obj type=<type> ver=<ver> seq=<seq> flags=<flags> count=<count> score=<score> x_mm=<x> y_mm=<y> z_mm=<z> w=<w> h=<h> yaw=<yaw> pitch=<pitch>
```

## 11. ESP32-S3 Checklist

- [ ] Implement `CogniCapPacket` as an 18-byte little-endian struct.
- [ ] Implement the type segments and constants exactly as listed in §3.
- [ ] Implement the flag bits in §4 and set `VALID` / `STALE` correctly.
- [ ] Send one 18-byte packet every poll from `ESP32_ADDR` when the micro:bit reads.
- [ ] Increment `seq` on every packet.
- [ ] Implement `CMD_SERVICE_ENABLE` (3-byte write) and keep a service-state table keyed by `type`.
- [ ] For `EVT_VOICE` set `count` to one of the `VoiceAction` token values in §5.1.
- [ ] For vision packets (`type >= 0x20`) populate `x_mm`, `y_mm`, `z_mm`, `w`, `h`, `yaw`, `pitch`.
- [ ] For status/voice packets (`type < 0x20`) zero bytes 6-17 and use `count` / `score` for tokens/status.
- [ ] Support at least the known services listed in §6.
- [ ] Optionally mirror the debug print format in §10.

## 12. Shared Constants Reference (C++)

```cpp
namespace CogniCapProtocol {
    constexpr uint8_t MUX_ADDR      = 0x70;
    constexpr uint8_t ESP32_ADDR    = 0x42;
    constexpr uint8_t SIZE          = 18;

    // Message type segments
    constexpr uint8_t EVT_IDLE        = 0x00;
    constexpr uint8_t EVT_ACTION      = 0x01;
    constexpr uint8_t EVT_WIFI        = 0x02;
    constexpr uint8_t EVT_WEBSITE     = 0x03;
    constexpr uint8_t EVT_CAMERA      = 0x04;
    constexpr uint8_t EVT_POWER       = 0x04; // alias
    constexpr uint8_t EVT_ROBOT       = 0x05;
    constexpr uint8_t EVT_VOICE       = 0x10;
    constexpr uint8_t EVT_WAKE        = 0x11;
    constexpr uint8_t EVT_FACE        = 0x20;
    constexpr uint8_t EVT_SOCCER_BALL = 0x21;
    constexpr uint8_t EVT_SOCCER_GOAL = 0x22;

    // Flags
    constexpr uint8_t VALID   = 1 << 0;
    constexpr uint8_t STALE   = 1 << 1;
    constexpr uint8_t CAPTURE = 1 << 2;
    constexpr uint8_t WEB     = 1 << 3;
    constexpr uint8_t SLEEP   = 1 << 4;

    // Service enable
    constexpr uint8_t CMD_SERVICE_ENABLE = 0x08;
    constexpr uint8_t SVC_OFF = 0;
    constexpr uint8_t SVC_ON  = 1;
    constexpr uint8_t SVC_ERR = 2;

    enum class VoiceAction : uint8_t {
        Rest    = 1,
        Go      = 2,
        Back    = 3,
        Stop    = 4,
        Jump    = 5,
        Kick    = 6,
        Sing    = 7,
        Talk    = 8,
        Dance   = 9,
        Left    = 10,
        Right   = 11,
        Straight= 12,
        Wakeup  = 13
    };
}
```
