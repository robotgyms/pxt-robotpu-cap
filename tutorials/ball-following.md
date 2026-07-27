# Ball Following with CogniCap

## Goal

Make Robot PU follow a soccer ball on the floor.

## How it works

`follow object` does three things:

1. It keeps the head pointed at the chosen object.
2. It computes walk speed and turn to keep the object centred.
3. It sends the walk command to `robotPuPro.walk(...)`.

`robotPuCap.enableDetections([robotPuCap.CapObject.Ball])` turns off the other detectors so the ESP32-S3 only spends power looking for the ball.

The robot stops roughly `distance` millimetres from the object. A larger `distance` stops farther away, a smaller `distance` lets it get closer.

## Blocks used

- `start CogniCap`
- `follow %object at distance %distance mm speed gain %speedGain turn gain %turnGain decay %decay`
- `search for %object`

## Example

```typescript
robotPuCap.startCogniCap();
robotPuCap.enableDetections([robotPuCap.CapObject.Ball]);

basic.forever(function () {
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2, 0.7);
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2, 0.7);
    }
    basic.pause(5);
});
```

## Tuning

- `distance` (150 in the example) is the target stop distance in mm.
- `speedGain` (0.4) controls how fast the robot moves toward the ball. Reduce it if it overshoots.
- `turnGain` (-0.2) controls how sharply it turns to keep the ball centred. Make it less negative if the robot wobbles.
- `decay` (0.7) is the follow-through multiplier while the ball is briefly out of view. Closer to 1 keeps the robot moving longer; closer to 0 stops it sooner. It must be between 0.001 and 1.
- If the ball is lost, `search for %object` scans the head through the search pattern while `follow object` decays to a stop.
