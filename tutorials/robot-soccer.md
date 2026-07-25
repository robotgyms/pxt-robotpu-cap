# Robot Soccer with CogniCap

## Goal

Find the ball, walk behind it, face the goal, and kick the ball toward the goal.

## How it works

When both the ball and the goal are visible:

1. `follow ball` tracks the ball with the head and computes walk commands.
2. When the robot is close to the ball, it computes the angle to the goal.
3. The robot turns toward the goal.
4. When the heading error is small enough, it executes `robotPuPro.kick()`.

If only the ball is seen, the robot simply follows it. If nothing is seen, the robot searches for the ball.

## Blocks used

- `start CogniCap`
- `object detected`
- `object x (mm)` / `object y (mm)`
- `follow ball`
- `ball follow speed` / `ball follow turn`
- `search for ball`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    let ballSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Ball);
    let goalSeen = robotPuCap.objectDetected(robotPuCap.CapObject.Goal);

    if (ballSeen && goalSeen) {
        robotPuCap.followBall();
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
        } else {
            robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
        }
    } else if (ballSeen) {
        robotPuCap.followBall();
        robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
    } else {
        robotPuCap.searchForBall();
        robotPuPro.walk(0, 1);
    }

    basic.pause(20);
});
```

## Tuning

- `200` is the distance in mm where the robot starts aligning to the goal. Increase it for an earlier turn, decrease it to get closer before kicking.
- `15` is the kick angle tolerance in degrees. Lower it for a more accurate kick, raise it to kick sooner.
- `1` is the slow approach speed. Increase it if the robot stalls, decrease it for better control.
