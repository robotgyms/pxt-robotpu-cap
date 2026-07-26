# Voice Control

## What you need

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat with a microphone
- RobotEU firmware with WakeNet and MultiNet enabled

## Goal

Control the robot with your voice. Wake the robot with the wake word, then say commands like `go`, `straight`, `left`, `right`, `back`, `stop`, `kick`, `dance`, `sing`, `talk`, `rest`, or `wakeup`.

## How it works

The CogniCap hat listens for a wake word using **WakeNet** and recognizes command words using **MultiNet**. When it hears a command, it sends an I2C packet with message type `0x10` and an **action token** in `count` (payload byte `4`). The micro:bit can use the `on voice action` block to react to each token.

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `on wake word`
- `on voice action`
- `voice command`
- `last action token`

## Steps

1. Open MakeCode for micro:bit and add the **CogniCap for Robot PU** extension.
2. In `on start`, call `robotPuCap.startCogniCap()` and `robotPuCap.enableVoiceCommands(true)`.
3. Use `on wake word` to show that the robot is listening.
4. Use `on voice action` blocks to map each command to a robot move.
5. Use `robotPuPro.walk(speed, turn)` to drive Robot PU.

## Action tokens

| Voice | Token value |
| --- | ---: |
| `rest` | 1 |
| `go` | 2 |
| `back` | 3 |
| `stop` | 4 |
| `jump` | 5 |
| `kick` | 6 |
| `sing` | 7 |
| `talk` | 8 |
| `dance` | 9 |
| `left` | 10 |
| `right` | 11 |
| `straight` | 12 |
| `wakeup` | 13 |

## Example

```typescript
let exploring = false;

robotPuCap.startCogniCap();
robotPuCap.enableVoiceCommands(true);

robotPuCap.onWakeWord(function () {
    basic.showIcon(IconNames.Surprised);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Go, function () {
    exploring = true;
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Straight, function () {
    robotPuPro.walk(2, 0);
    basic.pause(500);
    robotPuPro.walk(0, 0);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Back, function () {
    robotPuPro.walk(-2, 0);
    basic.pause(500);
    robotPuPro.walk(0, 0);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Left, function () {
    robotPuPro.walk(0, -1);
    basic.pause(400);
    robotPuPro.walk(0, 0);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Right, function () {
    robotPuPro.walk(0, 1);
    basic.pause(400);
    robotPuPro.walk(0, 0);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    exploring = false;
    robotPuPro.walk(0, 0);
});

basic.forever(function () {
    if (exploring) {
        robotPuPro.walk(1, 0);
    }
    basic.pause(20);
});
```

## Tips

- The `go` token starts the exploring state; `stop` ends it.
- `straight` moves the robot forward for a short distance.
- Use `voice command` to see the last command string, or `last action token` to read the raw number.
- The action packet is broadcast for about 2 seconds, but the CogniCap extension only triggers `on voice action` once per token to avoid repeats.
- On memory-constrained boards MultiNet may be a mock backend, so some command words are simulated from the action-token table.
