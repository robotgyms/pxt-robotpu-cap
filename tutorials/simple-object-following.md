---
name: Simple Object Following
description: Easy version — follow any object and keep your distance, with one block.
---

# Simple Object Following

`follow` is a complete feedback loop in one block: it reads the object's angle and distance, turns toward it, and walks to a target distance — speeding up when it's far, slowing when it's close.

## What you need

- micro:bit V2 + Robot PU + CogniCap

## The program

```typescript
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Face])

basic.forever(function () {
    robotPuCap.followObject(robotPuCap.CapObject.Face, 500, 0.4, -0.2, 0.76)
    basic.pause(10)
})
```

## How it works

- `distance` (500 mm): where it tries to stop — closer and it backs up a little.
- `speedGain` (0.4): how fast it approaches per mm of distance error.
- `turnGain` (-0.2): how sharply it turns to keep the object centred (the negative sign steers *toward*).
- `decay` (0.76): how much it coasts while the object flickers out of view.
- If the object is lost too long, `follow` stops driving — the robot waits where it is.

## Try it

- Stand in front, step back → it walks to you.
- Step into its face → it backs off to 500 mm.
- Swap `Face` for `Ball` or `Goal`.

## What's next

- [Object Following](object-following.md) — hand-code the same loop and tune every gain
- [Social Distance](social-distance.md) — add a "too close" complaint and hysteresis
