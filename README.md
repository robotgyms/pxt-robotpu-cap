# pxt-robotpu-cap — CogniCap for Robot PU

## Overview

`pxt-robotpu-cap` is a MakeCode extension for the BBC micro:bit V2 that adds the **CogniCap** smart hat to [Robot PU](https://robotgyms.com/pu).

CogniCap uses an **ESP32-S3** co-processor to add:

- **AI vision** (face, ball, line, obstacle detection)
- **Voice command** recognition
- **Q-table reinforcement learning** for simple autonomous behavior

This extension is intended to sit on top of `pxt-robotpu-pro` and only runs on micro:bit V2.

## Hardware

- Robot PU (micro:bit V2 compatible)
- CogniCap smart hat (ESP32-S3, camera, microphone)

## Blocks

Open MakeCode, add this extension, and look for the **CogniCap** category.

### Setup

- `start CogniCap` — power up the ESP32-S3 vision/voice pipeline.
- `stop CogniCap` — shut the pipeline down.

### Vision

- `vision detected <type>` — returns `true` when the selected object is seen.

### Voice

- `voice command` — returns the latest recognised command string.

### Learning

- `reset Q-table` — clear the 64-state × 8-action table.
- `set Q reward state <state> action <action> reward <reward>` — store a reward.
- `Q value state <state> action <action>` — read a stored value.
- `best Q action for state <state>` — pick the action with the highest Q value.

## Example

```typescript
robotPuCap.startCogniCap();
if (robotPuCap.visionDetected(robotPuCap.DetectType.Ball)) {
    basic.showIcon(IconNames.Happy);
}
```

## Dependencies

This extension depends on `pxt-robotpu-pro`. Update the GitHub reference in `pxt.json` if your fork or tag differs.

## License

MIT
