# CogniCap Tutorials

This folder contains MakeCode / TypeScript tutorials for the **CogniCap** smart-hat add-on for Robot PU.

The tutorials are arranged from low-level I2C commands up to high-level behaviours. Start at the top and work down.

## Tutorials

| # | Tutorial | Difficulty | What you will learn |
|---|----------|------------|---------------------|
| 1 | [CogniCap Setup](cognicap-setup.md) | ★ | Power on, connect to Wi-Fi, and verify the camera and packets. |
| 2 | [I2C Packet Format](i2C-packets.md) | ★ | The 18-byte packet layout and type segments. |
| 3 | [I2C Send and Receive](i2c-send-receive.md) | ★★ | Send commands and parse 18-byte packets from the ESP32-S3. |
| 4 | [I2C Event Handling](i2c-event-handlling.md) | ★★ | React to packets with `onObjectDetected`, `onI2CMessage`, `onVoiceAction`. |
| 5 | [Object Tracking](object-tracking.md) | ★★★ | Track face, ball, or goal while keeping the body still. |
| 6 | [Face Interaction](face-interaction.md) | ★★★ | Keep the head pointed at a face and add fun reactions. |
| 7 | [Interact and Random Talk](interact-random-talk.md) | ★★★ | Track a face, randomly talk, and explore when the face is lost. |
| 8 | [Ball Following](ball-following.md) | ★★★★ | Follow a soccer ball on the floor. |
| 9 | [Object Following](object-following.md) | ★★★★ | Hand-code the `followObject` feedback loop and tune it. |
| 10 | [Soccer Game](soccer-game.md) | ★★★★ | Find the ball, align to the goal, and kick. |
| 11 | [Voice Control](voice-control.md) | ★★★ | Wake the robot and drive it with WakeNet/MultiNet voice commands. |
| 12 | [Personality with Q-Learning](personality-qtable.md) | ★★★★★ | Train a 64-state Q-table during rest to give Robot PU a personality. |
| 13 | [QTable Follow and Kick](qtable-follow-kick-ball.md) | ★★★★★ | Use a Q-table to tweak feedback gains and switch mode for following and kicking the ball. |

## Requirements

- BBC micro:bit V2
- Robot PU
- CogniCap smart hat (ESP32-S3)
