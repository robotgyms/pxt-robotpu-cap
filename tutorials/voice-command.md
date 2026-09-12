---
name: Voice Command
description: Link spoken commands such as go, stop, walk, and kick to Robot PU actions using on voice command events.
---

# Voice Command

Use the `VoiceAction` tokens from the CogniCap MultiNet voice service to make the robot move, rest, or react when you say a command. You can register one handler per command, or one handler for all commands and inspect the latest token.

## Goal

- Enable the MultiNet voice service on CogniCap.
- Map spoken commands to `robotPuPro` actions.
- Use `on voice command %action` for a single command.
- Use `on any voice command` with `last voice command` to handle every command in one place.
- Decide when the built-in voice-action engine should run and when your code takes over.

## How it works

1. `robotPuCap.startCogniCap()` starts the I2C loop that reads packets from the ESP32-S3.
2. `robotPuCap.enableVoiceCommands(true)` tells the ESP32-S3 to listen for MultiNet voice commands.
3. The default `enable voice action engine true` automatically maps every recognised word to a `robotPuPro` action.
4. When you drag an `on voice command %action` block, that token gets a custom handler and the engine does **not** run for that token.
5. When you drag an `on any voice command` block, **all** tokens go to your handler, so the engine does not run at all.
6. `last voice command` returns the most recent `VoiceAction` token, which you can compare with the `VoiceAction` enum to choose an action.

## Available voice commands

The full `VoiceAction` enum is listed below. The block label is the word the robot should learn.

| Token | Word | Suggested action |
|-------|------|------------------|
| `Rest` | rest | `robotPuPro.rest()` |
| `Go` | go | `robotPuPro.walk(5, 0)` |
| `Back` | back | `robotPuPro.walk(-3, 0)` |
| `Stop` | stop | `robotPuPro.rest()` |
| `Jump` | jump | `robotPuPro.start(robotPuPro.Action.Jump, 1)` |
| `Kick` | kick | `robotPuPro.start(robotPuPro.Action.Kick, 1)` |
| `Sing` | sing | `billy.say("la la la")` / `music.play(...)` |
| `Talk` | talk | `billy.say("hello")` |
| `Dance` | dance | `robotPuPro.start(robotPuPro.Action.Dance, 1)` |
| `Left` | left | `robotPuPro.walk(0, -1)` |
| `Right` | right | `robotPuPro.walk(0, 1)` |
| `Straight` | straight | `robotPuPro.walk(5, 0)` |
| `Wakeup` | wake up | `robotPuPro.stand()` / wake-up sound |
| `Walk` | walk | `robotPuPro.walk(5, 0)` |
| `WalkBackward` | walk backward | `robotPuPro.walk(-4, 0)` |
| `TurnLeft` | turn left | `robotPuPro.walk(0, -2)` |
| `TurnRight` | turn right | `robotPuPro.walk(0, 2)` |
| `Explore` | explore | `robotPuPro.explore()` |
| `Sit` | sit | `robotPuPro.sit()` |
| `Stand` | stand | `robotPuPro.stand()` |
| `Laugh` | laugh | `robotPuPro.start(robotPuPro.Action.Laugh, 1)` |
| `Cry` | cry | `robotPuPro.start(robotPuPro.Action.Cry, 1)` |
| `Scream` | scream | `robotPuPro.start(robotPuPro.Action.Scream, 1)` |
| `Funny` | funny | `robotPuPro.start(robotPuPro.Action.Funny, 1)` |
| `Blink` | blink | `robotPuPro.blink(3)` |
| `Greet` | greet | `billy.say("hello I see you")` |
| `Drive` | drive | `robotPuPro.start(robotPuPro.Action.Drive, 0)` |
| `Calibrate` | calibrate | `robotPuPro.start(robotPuPro.Action.Calibrate, 1)` |
| `Duck` | duck | `robotPuPro.start(robotPuPro.Action.Duck, 1)` |

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `on voice command %action`
- `on any voice command`
- `last voice command`
- `enable voice action engine`
- `rest`, `walk`, `stand`, `sit`, `explore`, `blink`
- `billy say`

## Example

This example registers one handler for each of the most common commands. Because a handler is registered for every token, the built-in engine is bypassed and your code is in full control.

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)

// If you do not use on voice command for every token, leave the engine on.
// If every token has a handler or you use on any voice command,
// the engine is bypassed for those tokens.

robotPuCap.onVoiceAction(VoiceAction.Go, function () {
    robotPuPro.walk(5, 0)
    billy.say("going")
})

robotPuCap.onVoiceAction(VoiceAction.Stop, function () {
    robotPuPro.rest()
    billy.say("stopped")
})

robotPuCap.onVoiceAction(VoiceAction.TurnLeft, function () {
    robotPuPro.walk(0, -2)
})

robotPuCap.onVoiceAction(VoiceAction.TurnRight, function () {
    robotPuPro.walk(0, 2)
})

robotPuCap.onVoiceAction(VoiceAction.Walk, function () {
    robotPuPro.walk(5, 0)
})

robotPuCap.onVoiceAction(VoiceAction.Kick, function () {
    robotPuPro.start(robotPuPro.Action.Kick, 1)
    billy.say("kick")
})

robotPuCap.onVoiceAction(VoiceAction.Sit, function () {
    robotPuPro.sit()
})

robotPuCap.onVoiceAction(VoiceAction.Stand, function () {
    robotPuPro.stand()
})
```

### One handler for every command

If you prefer to put everything in one event, use `on any voice command` and a chain of `if` checks.

```typescript
robotPuCap.onVoiceCommand(function () {
    let cmd = robotPuCap.lastVoiceCommand()
    if (cmd == VoiceAction.Go || cmd == VoiceAction.Walk || cmd == VoiceAction.Straight) {
        robotPuPro.walk(5, 0)
    } else if (cmd == VoiceAction.Back || cmd == VoiceAction.WalkBackward) {
        robotPuPro.walk(-4, 0)
    } else if (cmd == VoiceAction.Stop || cmd == VoiceAction.Rest) {
        robotPuPro.rest()
    } else if (cmd == VoiceAction.Left || cmd == VoiceAction.TurnLeft) {
        robotPuPro.walk(0, -2)
    } else if (cmd == VoiceAction.Right || cmd == VoiceAction.TurnRight) {
        robotPuPro.walk(0, 2)
    } else if (cmd == VoiceAction.Sit) {
        robotPuPro.sit()
    } else if (cmd == VoiceAction.Stand) {
        robotPuPro.stand()
    } else if (cmd == VoiceAction.Kick) {
        robotPuPro.start(robotPuPro.Action.Kick, 1)
    } else {
        // unknown or unhandled command
        robotPuPro.blink(1)
    }
})
```

## Tuning

- `enable voice commands true` must run before `on voice command` events will fire.
- The default `enable voice action engine true` is useful for quick tests; the robot moves as soon as a command is recognised.
- Use `on voice command %action` when you want direct, per-command mapping.
- Use `on any voice command` when you want one place to decide what to do, especially for experimenting with personality or Q-table logic.
- The exact `robotPuPro` actions that exist depend on the installed `pxt-robotpu-pro` package. If `Action.Kick`, `Action.Drive`, or `watchDogOn` are unavailable, replace them with `walk`, `rest`, or `stand`.

## What to try next

- Add `billy.say` confirmations so the robot tells you what it is about to do.
- Combine voice commands with object tracking: say `go` and have the robot walk toward the last detected ball.
- Use `on any voice command` with the Q-table so positive or negative sentiment feedback changes what the robot does next.
