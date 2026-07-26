# Ball Following with CogniCap

## Goal

Make Robot PU follow a soccer ball on the floor.

## How it works

`follow object` does three things:

1. It keeps the head pointed at the chosen object.
2. It computes walk speed and turn to keep the object centred.
3. It sends the walk command to `robotPuPro.walk(...)`.

The robot stops roughly `distance` millimetres from the object. A larger `distance` stops farther away, a smaller `distance` lets it get closer.

## Blocks used

- `start CogniCap`
- `follow %object at distance %distance mm speed gain %speedGain turn gain %turnGain`
- `search for %object`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
    }
    basic.pause(5);
});
```

## Tuning

- `distance` (150 in the example) is the target stop distance in mm.
- `speedGain` (0.4) controls how fast the robot moves toward the ball. Reduce it if it overshoots.
- `turnGain` (-0.2) controls how sharply it turns to keep the ball centred. Make it less negative if the robot wobbles.
- If the ball is lost, `search for %object` scans the head through the search pattern.
