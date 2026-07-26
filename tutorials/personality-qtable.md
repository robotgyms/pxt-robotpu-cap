# Give Robot PU a Personality with Q-Learning

## Goal

Use the small built-in Q-table so Robot PU slowly develops a "personality" by learning which action it likes in each situation. Training only happens while the robot is resting, so its motion is not disturbed while it explores.

## What is the Q-table?

The CogniCap extension has a 64-state by 8-action Q-table:

- `reset Q-table` — clears all learned rewards.
- `set Q reward state <state> action <action> reward <reward>` — stores a reward for a state-action pair.
- `best Q action for state <state>` — picks the action with the highest stored reward.

The available `QAction` values are:

- `Rest`
- `Walk`
- `TurnLeft`
- `TurnRight`
- `Dance`
- `Kick`
- `Search`
- `Approach`

## States

For this tutorial we use a simple state map. You can encode a situation with up to 6 bits (states `0` to `63`):

| Value | Meaning |
| ---: | --- |
| `1` | A face is detected |
| `2` | A ball is detected |
| `4` | A goal is detected |

So:

- `0` = nothing detected
- `1` = face only
- `2` = ball only
- `4` = goal only
- `3` = face + ball
- `5` = face + goal
- `6` = ball + goal
- `7` = face + ball + goal

## Designing a personality

Choose rewards that represent the personality you want:

- A **curious** robot: reward `Search` and `Walk` when it sees nothing.
- A **friendly** robot: reward `Dance` when it sees a face.
- A **soccer robot**: reward `Approach` or `Kick` when it sees the ball.
- A **lazy** robot: reward `Rest` often.

Because the Q-table has only 64 states, keep the state map small. You can add more bits later if you need them.

## Training only during rest

We only update the Q-table while `robotPuPro.mode()` is `Rest`. That way the robot is still and stable while it "thinks" about what it just experienced. After resting, the robot can use `best Q action` to act out its learned preferences.

## Example

```typescript
robotPuCap.startCogniCap();
robotPuCap.resetQTable();

function stateId(): number {
    let s = 0;
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) s += 1;
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) s += 2;
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Goal)) s += 4;
    return s;
}

function act(action: number) {
    if (action == robotPuCap.QAction.Dance) {
        robotPuPro.setModeVar(robotPuPro.Mode.Dance);
    } else if (action == robotPuCap.QAction.Walk) {
        robotPuPro.walk(2, 0);
    } else if (action == robotPuCap.QAction.TurnLeft) {
        robotPuPro.walk(0, 1);
    } else if (action == robotPuCap.QAction.TurnRight) {
        robotPuPro.walk(0, -1);
    } else if (action == robotPuCap.QAction.Kick) {
        robotPuPro.kick();
    } else if (action == robotPuCap.QAction.Search) {
        robotPuCap.searchForObject(robotPuCap.CapObject.Ball);
    } else if (action == robotPuCap.QAction.Approach) {
        robotPuPro.walk(2, 0);
    } else {
        robotPuPro.setModeVar(robotPuPro.Mode.Rest);
    }
}

basic.forever(function () {
    let s = stateId();

    if (robotPuPro.mode() == robotPuPro.Mode.Rest) {
        // Training phase: give rewards based on what you want the robot to learn.
        if (s & 1) {
            robotPuCap.setQValue(s, robotPuCap.QAction.Dance, 10);
        }
        if (s & 2) {
            robotPuCap.setQValue(s, robotPuCap.QAction.Approach, 10);
        }
        if (s == 0) {
            robotPuCap.setQValue(s, robotPuCap.QAction.Search, 5);
        }
    } else {
        // Action phase: use the learned best action for the current state.
        let best = robotPuCap.getBestAction(s);
        act(best);
    }

    basic.pause(200);
});
```

## How to tweak the personality

- Change the reward numbers in `setQValue` to make some behaviours stronger or weaker.
- Add negative rewards to discourage actions:
  ```typescript
  robotPuCap.setQValue(s, robotPuCap.QAction.Rest, -5);
  ```
- Add more state bits, for example `+ 8` for "voice command received".
- Slow down or speed up learning by changing `basic.pause(200)`.

## Tips

- Reset the table with `robotPuCap.resetQTable()` before starting a new training session.
- Start with small rewards (`5` to `20`) so one behaviour does not dominate too quickly.
- Training during rest keeps the robot safe while it learns.
- Use `best Q action for state <state>` to inspect what the robot has learned.
