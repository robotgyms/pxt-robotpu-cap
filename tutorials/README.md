# CogniCap Tutorials

This folder contains MakeCode / TypeScript tutorials for the **CogniCap** smart-hat add-on for Robot PU.

The tutorials are arranged from low-level I2C commands up to high-level behaviours. Start at the top and work down.

## Tutorials

| # | Tutorial | Difficulty | What you will learn |
|---|----------|------------|---------------------|
| 1 | [Hello, CogniCap](hello-cognicap.md) | ★ | Load the extension and jump when the camera sees a face. |
| 2 | [CogniCap Setup](cognicap-setup.md) | ★ | Power on, connect to Wi-Fi, and verify the camera and packets. |
| 3 | [I2C Packet Format](i2C-packets.md) | ★ | The 18-byte packet layout and type segments. |
| 4 | [I2C Send and Receive](i2c-send-receive.md) | ★★ | Send commands and parse 18-byte packets from the ESP32-S3. |
| 5 | [I2C Event Handling](i2c-event-handlling.md) | ★★ | React to packets with `onObjectDetected`, `onI2CMessage`, `onVoiceAction`. |
| 6 | [Object Tracking](object-tracking.md) | ★★★ | Track face, ball, or goal while keeping the body still. |
| 7 | [Face Interaction](face-interaction.md) | ★★★ | Keep the head pointed at a face and add fun reactions. |
| 8 | [Interact and Random Talk](interact-random-talk.md) | ★★★ | Track a face, randomly talk, and explore when the face is lost. |
| 9 | [Ball Following](ball-following.md) | ★★★★ | Follow a soccer ball on the floor. |
| 10 | [Object Following](object-following.md) | ★★★★ | Hand-code the `followObject` feedback loop and tune it. |
| 11 | [Soccer Game](soccer-game.md) | ★★★★ | Find the ball, align to the goal, and kick. |
| 12 | [Voice Command](voice-command.md) | ★★★ | Map `VoiceAction` tokens to `robotPuPro` actions using `on voice command` events. |
| 13 | [Personality with Q-Learning](personality-qtable.md) | ★★★★★ | Train a 64-state Q-table during rest to give Robot PU a personality. |
| 14 | [QTable Follow and Kick](qtable-follow-kick-ball.md) | ★★★★★ | Use a Q-table to tweak feedback gains and switch mode for following and kicking the ball. |
| 15 | [Walkie-Talkie](walkie-talkie.md) | ★★★★ | Follow a face, walk to keep a comfortable distance, and talk with 30 random conversation starters. |
| 16 | [Sit, Watch, and Chat](sit-watch-chat.md) | ★★★ | Sit in place, look around for a face, and start a random conversation when it finds one. |
| 17 | [Attention](attention.md) | ★★★ | React to the `p u` / `pew` attention prefix (token 30) by standing up, tracking the speaker's face, and walking to face them at a comfortable distance. |
| 18 | [Social Distance](social-distance.md) | ★★★★ | Follow a face while keeping a one-metre bubble — step closer when far, back away when too close, and complain about it. |

## Requirements

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat (ESP32-S3)
