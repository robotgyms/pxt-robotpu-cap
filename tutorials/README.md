# CogniCap Tutorials

This folder contains MakeCode / TypeScript tutorials for the **CogniCap** smart-hat add-on for Robot PU.

The tutorials are arranged from low-level I2C commands up to high-level behaviours. Start at the top and work down.

## Tutorials

| # | Tutorial | Difficulty | What you will learn |
|---|----------|------------|---------------------|
| 1 | [Hello, CogniCap](hello-cognicap.md) | ★ | Load the extension and jump when the camera sees a face. |
| 2 | [Simple Reflex](simple-reflex.md) | ★ | Give the robot reflexes — one `on ...` event block plus one `start ...` action per rule. |
| 3 | [CogniCap Setup](cognicap-setup.md) | ★ | Power on, connect to Wi-Fi, and verify the camera and packets. |
| 4 | [I2C Packet Format](i2C-packets.md) | ★ | The 18-byte packet layout and type segments. |
| 5 | [I2C Send and Receive](i2c-send-receive.md) | ★★ | Send commands and parse 18-byte packets from the ESP32-S3. |
| 6 | [I2C Event Handling](i2c-event-handlling.md) | ★★ | React to packets with `onObjectDetected`, `onI2CMessage`, `onVoiceAction`. |
| 7 | [Object Tracking](object-tracking.md) | ★★★ | Track face, ball, or goal while keeping the body still. |
| 8 | [Face Interaction](face-interaction.md) | ★★★ | Keep the head pointed at a face and add fun reactions. |
| 9 | [Interact and Random Talk](interact-random-talk.md) | ★★★ | Track a face, randomly talk, and explore when the face is lost. |
| 10 | [Ball Following](ball-following.md) | ★★★★ | Follow a soccer ball on the floor. |
| 11 | [Object Following](object-following.md) | ★★★★ | Hand-code the `followObject` feedback loop and tune it. |
| 12 | [Soccer Game](soccer-game.md) | ★★★★ | Find the ball, align to the goal, and kick. |
| 13 | [Voice Command](voice-command.md) | ★★★ | Map `VoiceAction` tokens to `robotPuPro` actions using `on voice command` events. |
| 14 | [Personality with Q-Learning](personality-qtable.md) | ★★★★★ | Train a 64-state Q-table during rest to give Robot PU a personality. |
| 15 | [QTable Follow and Kick](qtable-follow-kick-ball.md) | ★★★★★ | Use a Q-table to tweak feedback gains and switch mode for following and kicking the ball. |
| 16 | [Walkie-Talkie](walkie-talkie.md) | ★★★★ | Follow a face, walk to keep a comfortable distance, and talk with 30 random conversation starters. |
| 17 | [Sit, Watch, and Chat](sit-watch-chat.md) | ★★★ | Sit in place, look around for a face, and start a random conversation when it finds one. |
| 18 | [Attention](attention.md) | ★★★ | React to the `p u` / `pew` attention prefix (token 30) by standing up, tracking the speaker's face, and walking to face them at a comfortable distance. |
| 19 | [Social Distance](social-distance.md) | ★★★★ | Follow a face while keeping a one-metre bubble — step closer when far, back away when too close, and complain about it. |


## Easy versions (start here)

Every tutorial rated ★★★ or higher has a stripped-down `simple-` variant: the same behaviour in the fewest blocks possible, ideal as a first pass before the full lesson.

| Easy version | Full tutorial |
|---|---|
| [Hello, CogniCap](hello-cognicap.md) + [Simple Reflex](simple-reflex.md) | event → action basics |
| [Simple Voice Command](simple-voice-command.md) | [Voice Command](voice-command.md) |
| [Simple Object Tracking](simple-object-tracking.md) | [Object Tracking](object-tracking.md) |
| [Simple Face Interaction](simple-face-interaction.md) | [Face Interaction](face-interaction.md) |
| [Simple Talk](simple-interact-talk.md) | [Interact and Random Talk](interact-random-talk.md) |
| [Simple Object Following](simple-object-following.md) | [Object Following](object-following.md) |
| [Simple Ball Following](simple-ball-following.md) | [Ball Following](ball-following.md) |
| [Simple Soccer](simple-soccer.md) | [Soccer Game](soccer-game.md) |
| [Simple Sit and Chat](simple-sit-chat.md) | [Sit, Watch, and Chat](sit-watch-chat.md) |
| [Simple Attention](simple-attention.md) | [Attention](attention.md) |
| [Simple Social Distance](simple-social-distance.md) | [Social Distance](social-distance.md) |
| [Simple Walkie-Talkie](simple-walkie-talkie.md) | [Walkie-Talkie](walkie-talkie.md) |
| [Simple Q-Table](simple-qtable.md) | [Personality with Q-Learning](personality-qtable.md) |
| [Simple Q-Table Kick](simple-qtable-kick.md) | [QTable Follow and Kick](qtable-follow-kick-ball.md) |

## Requirements

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat (ESP32-S3)
