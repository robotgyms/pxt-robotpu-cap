---
name: Simple Q-Table
description: Easy version — teach the robot preferences with rewards, then let it pick.
---

# Simple Q-Table

A Q-table is just a scoreboard: each **state** (what's happening) has a row, each **action** (what it could do) has a column, and every cell holds a reward score. `best Q action` picks the highest-scoring action for the current state.

## What you need

- micro:bit V2 + Robot PU + CogniCap

## The program

```typescript
robotPuCap.startCogniCap()

// Teach the table: in state 0, dancing is good (+10), resting is bad (-5)
robotPuCap.setQValue(0, robotPuCap.QAction.Dance, 10)
robotPuCap.setQValue(0, robotPuCap.QAction.Rest, -5)
// In state 1, resting is the best choice
robotPuCap.setQValue(1, robotPuCap.QAction.Rest, 10)

basic.forever(function () {
    // state 1 when a face is present, state 0 when alone
    let state = robotPuCap.objectDetected(robotPuCap.CapObject.Face) ? 1 : 0
    let best = robotPuCap.getBestAction(state)
    if (best == robotPuCap.QAction.Dance) {
        robotPuPro.start(robotPuPro.Action.Dance, 0)
    } else {
        robotPuPro.start(robotPuPro.Action.Rest, 0)
    }
    basic.pause(500)
})
```

## How it works

1. `setQValue(state, action, reward)` writes a score into the 64-state × 8-action table.
2. `getBestAction(state)` reads the row and returns the action with the highest score.
3. The `if` at the bottom turns the chosen action into a real move — the Q-table only picks; your code acts.

## Try it

- Nobody there → state 0 → the robot dances.
- Show your face → state 1 → it rests politely.
- Change the rewards: `setQValue(0, QAction.Rest, 20)` flips the preference.

## What's next

- [Personality with Q-Learning](personality-qtable.md) — update rewards from live sentiment words so the robot *learns* a personality
