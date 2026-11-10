---
name: Simple Q-Table Kick
description: Easy version — a two-state Q-table that decides follow vs kick.
---

# Simple Q-Table Kick

Use a Q-table for one decision: when the ball is **far**, follow it; when it's **near**, kick it. The table holds the policy — change the scores and the behaviour changes, no re-coding.

## What you need

- micro:bit V2 + Robot PU + CogniCap + a ball

## The program

```typescript
const FAR = 0
const NEAR = 1
const FOLLOW = 0
const KICK = 1

robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])

// The policy: follow far balls, kick near ones
robotPuCap.setQValue(FAR, FOLLOW, 10)
robotPuCap.setQValue(NEAR, KICK, 10)

basic.forever(function () {
    let state = FAR
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball) &&
        robotPuCap.objectY(robotPuCap.CapObject.Ball) < 250) {
        state = NEAR
    }
    if (robotPuCap.getBestAction(state) == KICK) {
        robotPuPro.start(robotPuPro.Action.Kick, 1)
    } else {
        robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2, 0.76)
    }
    basic.pause(30)
})
```

## How it works

1. `state` is computed from sensors each loop: `NEAR` when the ball is seen within 250 mm.
2. `getBestAction(state)` looks up the policy — the scores you wrote, not an `if` you hard-coded.
3. Because the decision lives in the table, a Q-table can *learn*: a separate loop can bump scores from rewards instead of you writing them.

## Try it

- Ball far → `FOLLOW` wins → it chases. Ball near → `KICK` wins → it kicks.
- Try `setQValue(FAR, KICK, 15)` — now it kicks from range too.

## What's next

- [QTable Follow and Kick](qtable-follow-kick-ball.md) — 64 states, side-step decisions, and stability-aware actions
