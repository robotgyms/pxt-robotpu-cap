# Ball Following with CogniCap

## Goal

Make Robot PU follow a soccer ball on the floor.

## How it works

`follow ball` does two things:

1. It keeps the head pointed at the ball.
2. It computes `ball follow speed` and `ball follow turn` so you can drive the robot with `robotPuPro.walk(...)`.

The robot stops roughly 150 mm from the ball. You can change this target distance by editing the code in `main.ts` if you need different behaviour.

## Blocks used

- `start CogniCap`
- `follow ball`
- `ball follow speed`
- `ball follow turn`

## Example

```typescript
robotPuCap.startCogniCap();

basic.forever(function () {
    robotPuCap.followBall();
    robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
    basic.pause(5);
});
```

## Tuning

- The robot stops when the ball is closer than 150 mm. Increase that number to stop farther away, decrease it to get closer.
- If the robot overshoots when turning, reduce the `0.2` turn gain in `main.ts`.
- If the ball is lost, use `search for ball` to scan the head.
