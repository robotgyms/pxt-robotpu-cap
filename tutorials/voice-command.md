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
| `Rest` | rest | `robotPuPro.start(robotPuPro.Action.Rest, 0)` |
| `Go` | go | `robotPuPro.start(robotPuPro.Action.Walk, 0)` |
| `Back` | back | `robotPuPro.start(robotPuPro.Action.WalkBackward, 0)` |
| `Stop` | stop | `robotPuPro.start(robotPuPro.Action.Rest, 0)` |
| `Jump` | jump | `robotPuPro.start(robotPuPro.Action.Jump, 1)` |
| `Kick` | kick | `robotPuPro.start(robotPuPro.Action.Kick, 1)` |
| `Sing` | sing | `billy.say("la la la")` / `music.play(...)` |
| `Talk` | talk | `billy.say("hello")` |
| `Dance` | dance | `robotPuPro.start(robotPuPro.Action.Dance, 0)` |
| `Left` | left | `robotPuPro.start(robotPuPro.Action.TurnLeft, 0)` |
| `Right` | right | `robotPuPro.start(robotPuPro.Action.TurnRight, 0)` |
| `Straight` | straight | `robotPuPro.start(robotPuPro.Action.Walk, 0)` |
| `Wakeup` | wake up | `robotPuPro.start(robotPuPro.Action.Greet, 1)` |
| `Walk` | walk | `robotPuPro.start(robotPuPro.Action.Walk, 0)` |
| `WalkBackward` | walk backward | `robotPuPro.start(robotPuPro.Action.WalkBackward, 0)` |
| `TurnLeft` | turn left | `robotPuPro.start(robotPuPro.Action.TurnLeft, 0)` |
| `TurnRight` | turn right | `robotPuPro.start(robotPuPro.Action.TurnRight, 0)` |
| `Explore` | explore | `robotPuPro.start(robotPuPro.Action.Explore, 0)` |
| `Sit` | sit | `robotPuPro.start(robotPuPro.Action.Sit, 0)` |
| `Stand` | stand | `robotPuPro.start(robotPuPro.Action.Stand, 0)` |
| `Laugh` | laugh | `robotPuPro.start(robotPuPro.Action.Laugh, 1)` |
| `Cry` | cry | `robotPuPro.start(robotPuPro.Action.Cry, 1)` |
| `Scream` | scream | `robotPuPro.start(robotPuPro.Action.Scream, 1)` |
| `Funny` | funny | `robotPuPro.start(robotPuPro.Action.Funny, 1)` |
| `Blink` | blink | `robotPuPro.start(robotPuPro.Action.Blink, 1)` |
| `Greet` | greet | `robotPuPro.start(robotPuPro.Action.Greet, 1)` |
| `Drive` | drive | `robotPuPro.start(robotPuPro.Action.Drive, 0)` |
| `Calibrate` | calibrate | `robotPuPro.start(robotPuPro.Action.Calibrate, 0)` |
| `Duck` | duck | `robotPuPro.start(robotPuPro.Action.Duck, 0)` |

## Blocks used

- `start CogniCap`
- `enable voice commands`
- `on voice command %action`
- `on any voice command`
- `last voice command`
- `enable voice action engine`
- `start action %action steps %steps`
- `billy say`

## Example

This example registers one handler for each of the most common commands. Because a handler is registered for every token, the built-in engine is bypassed and your code is in full control.

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableVoiceCommands(true)

// If you do not use on voice command for every token, leave the engine on.
// If every token has a handler or you use on any voice command,
// the engine is bypassed for those tokens.

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Go, function () {
    robotPuPro.start(robotPuPro.Action.Walk, 0)
    billy.say("going")
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stop, function () {
    robotPuPro.start(robotPuPro.Action.Rest, 0)
    billy.say("stopped")
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.TurnLeft, function () {
    robotPuPro.start(robotPuPro.Action.TurnLeft, 0)
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.TurnRight, function () {
    robotPuPro.start(robotPuPro.Action.TurnRight, 0)
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Walk, function () {
    robotPuPro.start(robotPuPro.Action.Walk, 0)
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Kick, function () {
    robotPuPro.start(robotPuPro.Action.Kick, 1)
    billy.say("kick")
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Sit, function () {
    robotPuPro.start(robotPuPro.Action.Sit, 0)
})

robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Stand, function () {
    robotPuPro.start(robotPuPro.Action.Stand, 0)
})
```

### One handler for every command

If you prefer to put everything in one event, use `on any voice command` and a chain of `if` checks.

```typescript
robotPuCap.onVoiceCommand(function () {
    let cmd = robotPuCap.lastVoiceCommand()
    if (cmd == robotPuCap.VoiceAction.Go || cmd == robotPuCap.VoiceAction.Walk || cmd == robotPuCap.VoiceAction.Straight) {
        robotPuPro.start(robotPuPro.Action.Walk, 0)
    } else if (cmd == robotPuCap.VoiceAction.Back || cmd == robotPuCap.VoiceAction.WalkBackward) {
        robotPuPro.start(robotPuPro.Action.WalkBackward, 0)
    } else if (cmd == robotPuCap.VoiceAction.Stop || cmd == robotPuCap.VoiceAction.Rest) {
        robotPuPro.start(robotPuPro.Action.Rest, 0)
    } else if (cmd == robotPuCap.VoiceAction.Left || cmd == robotPuCap.VoiceAction.TurnLeft) {
        robotPuPro.start(robotPuPro.Action.TurnLeft, 0)
    } else if (cmd == robotPuCap.VoiceAction.Right || cmd == robotPuCap.VoiceAction.TurnRight) {
        robotPuPro.start(robotPuPro.Action.TurnRight, 0)
    } else if (cmd == robotPuCap.VoiceAction.Sit) {
        robotPuPro.start(robotPuPro.Action.Sit, 0)
    } else if (cmd == robotPuCap.VoiceAction.Stand) {
        robotPuPro.start(robotPuPro.Action.Stand, 0)
    } else if (cmd == robotPuCap.VoiceAction.Kick) {
        robotPuPro.start(robotPuPro.Action.Kick, 1)
    } else {
        // unknown or unhandled command
        robotPuPro.start(robotPuPro.Action.Blink, 1)
    }
})
```

## Tuning

- `enable voice commands true` must run before `on voice command` events will fire.
- The default `enable voice action engine true` is useful for quick tests; the robot moves as soon as a command is recognised.
- Use `on voice command %action` when you want direct, per-command mapping.
- Use `on any voice command` when you want one place to decide what to do, especially for experimenting with personality or Q-table logic.
- Continuous actions (`Walk`, `TurnLeft`, `Sit`, `Dance`, etc.) use `start(..., 0)` and run until the command stream stops.
- One-shot actions (`Kick`, `Jump`, `Blink`, `Greet`, etc.) use `start(..., 1)` and run one cycle.

## What to try next

- Add `billy.say` confirmations so the robot tells you what it is about to do.
- Combine voice commands with object tracking: say `go` and have the robot walk toward the last detected ball.
- Use `on any voice command` with the Q-table so positive or negative sentiment feedback changes what the robot does next.
