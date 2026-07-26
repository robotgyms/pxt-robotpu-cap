# I2C Event Handling

## Goal

React to CogniCap events instead of polling fields manually.

## How it works

`robotPuCap` dispatches every I2C packet to a callback based on its message type. You can register callbacks for:

- any object detection event (`on %object detected`)
- any I2C message type (`on i2c message type %type`)
- wake word events (`on wake word`)
- voice action tokens (`on voice action %action`)

When the event happens, your callback runs automatically.

## Blocks used

- `on %object detected`
- `on i2c message type %type`
- `on wake word`
- `on voice action %action`
- `last action token`

## Example: face greeting

```typescript
robotPuCap.startCogniCap();

robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    basic.showIcon(IconNames.Happy);
    robotPuPro.leftEyeBright(0.5);
    robotPuPro.rightEyeBright(0.5);
});
```

## Example: voice drive

```typescript
robotPuCap.startCogniCap();
robotPuCap.enableVoiceCommands(true);

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Go, function () {
    robotPuPro.walk(2, 0);
});

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    robotPuPro.walk(0, 0);
});
```

## Example: raw message handler

```typescript
robotPuCap.startCogniCap();

robotPuCap.onI2CMessage(0x10, function () {
    let token = robotPuCap.lastActionToken();
    basic.showNumber(token);
});
```

## Tips

- `onObjectDetected` only fires when the selected object is newly detected and the packet is fresh.
- `onI2CMessage` can watch any type byte (0..255), so it is useful for debugging custom ESP32 messages.
- `last action token` gives the `count` byte for the last `EVT_ACTION` or `EVT_VOICE` packet.
