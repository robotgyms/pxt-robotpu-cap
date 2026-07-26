# Robot Soccer with CogniCap

## Goal

Find the ball, walk behind it, face the goal, and kick the ball toward the goal.

## How it works

When both the ball and the goal are visible:

1. `follow object` tracks the ball with the head and drives the robot toward it.
2. When the robot is close to the ball, it computes the angle to the goal.
3. The robot turns toward the goal.
4. When the heading error is small enough, it executes `robotPuPro.kick()`.

If only the ball is seen, the robot simply follows it. If nothing is seen, the robot searches for the ball and turns in place.

## Blocks used

- `start CogniCap`
- `object detected`
- `object x (mm)` / `object y (mm)`
- `follow %object at distance %distance mm speed gain %speedGain turn gain %turnGain`
- `search for %object`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    let ballSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Ball);
    let goalSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Goal);

    if (ballSeen && goalSeen) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
        // Once close to the ball, turn toward the goal and kick.
        if (robotPuCap.objectY(robotPuCap.CapObject.Ball) < 200) {
            let goalYaw = Math.atan2(
                robotPuCap.objectX(robotPuCap.CapObject.Goal),
                robotPuCap.objectY(robotPuCap.CapObject.Goal)
            ) * 57.3;
            robotPuPro.walk(1, goalYaw * -0.02);
            if (Math.abs(goalYaw) < 15) {
                robotPuPro.kick();
            }
        }
    } else if (ballSeen) {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
    } else {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
        robotPuPro.walk(0, 1);
    }

    basic.pause(20);
});
```

## Tuning

- `200` is the distance in mm where the robot starts aligning to the goal. Increase it for an earlier turn, decrease it to get closer before kicking.
- `15` is the kick angle tolerance in degrees. Lower it for a more accurate kick, raise it to kick sooner.
- `150` in `follow object` is the target distance from the ball. Adjust for your field.
- `0.4` speed gain and `-0.2` turn gain control the approach. Tune these if the robot overshoots or wobbles.
