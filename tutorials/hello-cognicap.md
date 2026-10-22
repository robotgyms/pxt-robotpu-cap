---
name: Hello, CogniCap
description: First class — load the CogniCap extension and make Robot PU jump when it sees your face.
---

# Hello, CogniCap

Your first CogniCap program. When the camera sees a face, Robot PU jumps. When you say **"rest"**, it goes back to rest.

## What you need

- BBC micro:bit V2
- Robot PU, battery on, on a flat safe surface (it will really jump!)
- CogniCap smart hat (ESP32-S3 + camera), snapped on and connected to the I2C hub

## Step 1 — Load the extension

1. Open [MakeCode for micro:bit](https://makecode.microbit.org) and click **New Project**.
2. Click the **gear icon** (top right) and choose **Extensions**.
3. Paste `robotgyms/pxt-robotpu-cap` into the search box and press **Enter**.
4. Click the **pxt-robotpu-cap** card to add it.
5. Two new toolbox drawers appear: **CogniCap** and **Robot PU**. The CogniCap extension brings Robot PU along automatically — you do not need to add it separately.

## Step 2 — The program

Switch to the **JavaScript** editor and paste:

```typescript
robotPuCap.startCogniCap()
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    robotPuPro.start(robotPuPro.Action.Jump, 2)
})
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Rest, function () {
    robotPuPro.start(robotPuPro.Action.Rest, 0)
})
```

That is the whole program — three lines of setup, two event handlers.

## How it works

1. `start CogniCap` opens the I2C mux and starts polling the camera board. All detection services — face detection **and** voice commands — turn on by default, so no extra setup is needed.
2. `on face detected` fires every time a face packet arrives. The handler runs `start jump for 2 steps` — the robot jumps while you are in view.
3. `on voice command rest` fires when the microphone hears the word **"rest"**. The handler runs `start rest for 0 steps` — `0` steps means *forever*, so the robot settles into its idle pose until the next face appears.

## Try it

1. Download the program to the micro:bit and unplug the cable.
2. Wait a few seconds for the CogniCap camera to boot.
3. Hold your face in front of the camera → **Robot PU jumps**.
4. Step out of view and say **"rest"** → **Robot PU rests**.

## Troubleshooting

- **Nothing happens**: open the serial console — `cognicap: no i2c packets yet` means the hat is not connected or not powered.
- **Jump does not stop while you watch**: that is expected — the event fires for every face packet, so the robot keeps jumping as long as it sees you.
- **"rest" is ignored**: the robot may need the wake word first depending on firmware — say the wake word, then "rest". See [Voice Command](voice-command.md).

## What's next

- [CogniCap Setup](cognicap-setup.md) — view the live camera feed over Wi-Fi
- [I2C Event Handling](i2c-event-handlling.md) — how `on ... detected` and `on voice command` events work
