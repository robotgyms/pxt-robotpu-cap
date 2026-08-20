# Use the QTable to follow and kick the ball

This tutorial shows how to use the Q-table to follow and kick a soccer ball. We start with a simple feedback-only controller, then add a Q-table layer that decides **when to tweak the feedback gains** and **when to switch mode** (for example, back up or kick).

## The feedback-only baseline

A good first step is to make the robot follow the ball with a pure feedback loop. The `followSpeed` is driven by the distance to the ball, and `followTurn` is driven by the ball's yaw angle. If the ball is not visible, the robot coasts, backs up, and finally stops.

```typescript
let followTurn = 0
let followSpeed = 0
let smoothPitch = 0
let smoothYaw = 0
let pitch = 0
let yaw = 0
let followLastTime = 0
let now = 0
let currentYaw = 0
let currentPitch = 0
let targets: number[] = []
let distance = 150
let speedGain = 0.4
let turnGain = -0.07
let decay = 0.9
let lostTimeout = 5000
let headGain = 0.08
let headSpeed = 8
robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])
// robotPuPro.setServoTrim(robotPuPro.ServoJoint.LeftFoot, -5)
// robotPuPro.setServoTrim(robotPuPro.ServoJoint.RightFoot, -5)
// robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadYaw, -8)
robotPuPro.setServoTrim(0, -7)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)
basic.forever(function () {
    now = input.runningTime()
    // followTurn = 0
    // smoothYaw = 0
    // smoothPitch = 0
    // robotPuCap.searchForObject(robotPuCap.CapObject.Ball)
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        followLastTime = now
        yaw = robotPuCap.objectYaw(robotPuCap.CapObject.Ball)
        pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Ball)
        smoothYaw = 0.9 * smoothYaw + 0.1 * yaw
        smoothPitch = 0.9 * smoothPitch + 0.1 * pitch
        robotPuPro.leftEyeBright(0.01)
        robotPuPro.rightEyeBright(0.01)
        followSpeed = Math.max(-6, Math.min(6, (robotPuCap.objectY(robotPuCap.CapObject.Ball) - distance) * speedGain))
        followTurn = 0.8 * followTurn + 0.2 * Math.max(-1, Math.min(1, smoothYaw * turnGain))
    } else if (now - followLastTime < lostTimeout) {
        smoothYaw = smoothYaw * decay
        smoothPitch = smoothPitch * decay
        followSpeed = followSpeed * decay
        followTurn = followTurn * decay
    } else if (now - followLastTime < 1.5 * lostTimeout) {
        // back up, hopefuly to find the object again
        followSpeed = -2
    } else {
        // lost the sight of object, stop
        followSpeed = 0
    }
    //serial.writeLine("headTrim:" + smoothPitch * 0.1)
    robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, smoothPitch + 5)
    robotPuPro.walkDo(followSpeed, followTurn)
    basic.pause(5)
})
```

This works, but the hand-tuned if-else logic is brittle. If the ball rolls faster, the robot overshoots. If the camera loses the ball for a moment, the robot may back up too early or too late. A Q-table can learn which feedback gain to use in each situation instead of hard-coding every case.

## Why use a Q-table?

The built-in Q-table in the CogniCap extension stores a **reward** for every `(state, action)` pair:

- **`state`**: a compact number that describes what the robot currently sees (e.g. ball on the far left, wobbling, ball close enough to kick).
- **`action`**: a choice the robot can make (e.g. side step left, slow down, kick).
- **`reward`**: a positive or negative score that tells the robot whether that action led to a better or worse situation.

At each step the robot looks at the current state, picks the action with the highest stored reward, and updates the Q-table using the reward it got from the new state. Over time it learns which actions work best.

The key idea in this tutorial is **not** to replace the feedback loop. The Q-table still uses the original `followSpeed = (ballY - distance) * speedGain` and `followTurn = ballYaw * turnGain` mapping. It only decides:

1. **Hyperparameters** – should `speedGain` be higher or lower right now?
2. **Mode switching** – should the robot side step, back up, stop, or kick instead of following?

## Set up S.A.A.S. (States, Actions, And State-transitions)

The Q-table in the CogniCap extension has room for 64 states and 8 actions. We encode every situation into a 6-bit state number.

### Actions

| Index | Action token | What it does |
|----:|:---|:---|
| 0 | `stop` | Stop all motion. |
| 1 | `forward` | Run the feedback loop with current `speedGain`. |
| 2 | `backward` | Back up straight. |
| 3 | `side step left` | Step to the left (`robotPuPro.sideStep(1)`). |
| 4 | `side step right` | Step to the right (`robotPuPro.sideStep(-1)`). |
| 5 | `increase speed gain` | Raise `speedGain` to move faster. |
| 6 | `decrease speed gain` | Lower `speedGain` to slow down and stabilize. |
| 7 | `kick` | Execute `robotPuPro.kick()`. |

### State bits

The state is a 6-bit number. Each bit is an **event** that is true right now:

| Bit | Event | Meaning |
|----:|:---|:---|
| 1 | `ball_detected` | A ball is currently visible. |
| 2 | `ball_in_kick_range` | Ball is within 200 mm and in front. |
| 4 | `ball_on_far_left` | Ball is more than 35° to the left. |
| 8 | `ball_on_far_right` | Ball is more than 35° to the right. |
| 16 | `ball_in_front` | Ball is within ±20° of the robot's heading. |
| 32 | `not_stable` | High variance in g-force from the accelerometer. |

`ball_lost` is the absence of `ball_detected` (state 0). The feedback loop handles the moderate left/right range between 20° and 35°.

### Initializing the Q-table

We seed the table with common-sense rewards so the robot is usable from the first run:

- Ball visible: default to `forward`.
- Ball far left: `side step left`.
- Ball far right: `side step right`.
- Ball in kick range and in front: `kick`.
- Not stable: `decrease speed gain`.
- Ball lost: `backward`.

The online `learn` step then improves these choices from experience.

## Set up the reward

The reward function gives the Q-table a signal to learn from. In this tutorial we use event-based rewards:

| Event | Reward |
|:---|---:|
| `ball_detected` | +1 |
| `ball_in_front` | +2 |
| `ball_in_kick_range` | +5 |
| `ball_on_far_left` | −3 |
| `ball_on_far_right` | −3 |
| `not_stable` | −2 |
| `ball_lost` | −5 |

> **Kick bonus.** Kicking is a special case. The new state after a kick is often `ball_lost` because the ball has been struck away, which would normally be negative. To stop the Q-table from unlearning the kick, `learn()` adds an extra `+15` whenever the action was `kick` and the previous state was `ball_in_kick_range`.

## Implementation

```typescript
let now = 0
let ballYaw = 0
let ballY = 0
let pitch = 0
let smoothPitch = 0
let lastState = 0
let lastAction = 0
let kickDone = 0
let sideStepDone = 0

// Feedback loop state
let speedGain = 0.4
let turnGain = -0.07
let distance = 150
let followSpeed = 0
let followTurn = 0

// Accelerometer-based stability estimate
let gMean = 1000
let gVar = 0
let stabilityThreshold = 50000
let decay = 0.9

// Q-table action indices
const A_STOP = 0
const A_FORWARD = 1
const A_BACKWARD = 2
const A_SIDE_STEP_LEFT = 3
const A_SIDE_STEP_RIGHT = 4
const A_INC_SPEED_GAIN = 5
const A_DEC_SPEED_GAIN = 6
const A_KICK = 7

// Build a state number from the current vision events and IMU.
// State bits:
//   1  ball_detected
//   2  ball_in_kick_range
//   4  ball_on_far_left
//   8  ball_on_far_right
//  16  ball_in_front
//  32  not_stable
function stateId(): number {
    let s = 0
    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        s += 1
        ballYaw = robotPuCap.objectYaw(robotPuCap.CapObject.Ball)
        ballY = robotPuCap.objectY(robotPuCap.CapObject.Ball)
        pitch = robotPuCap.objectPitch(robotPuCap.CapObject.Ball)
        smoothPitch = 0.9 * smoothPitch + 0.1 * pitch
        if (Math.abs(ballYaw) < 20) {
            s += 16
            if (ballY < 200) {
                s += 2
            }
        } else if (ballYaw > 35) {
            s += 4
        } else if (ballYaw < -35) {
            s += 8
        }
    } else {
        smoothPitch = smoothPitch * decay
    }

    // Estimate how shaky the robot is from the accelerometer magnitude.
    let ax = input.acceleration(Dimension.X)
    let ay = input.acceleration(Dimension.Y)
    let az = input.acceleration(Dimension.Z)
    let g = Math.sqrt(ax * ax + ay * ay + az * az)
    gMean = 0.95 * gMean + 0.05 * g
    gVar = 0.95 * gVar + 0.05 * (g - gMean) * (g - gMean)
    if (gVar > stabilityThreshold) {
        s += 32
    }
    return s
}

// Apply the Q-table action (mode switch or gain tweak), then run the
// original feedback mapping from ball distance / yaw to walk speed / turn.
function act(action: number) {
    if (action == A_KICK) {
        now = input.runningTime()
        if (now - kickDone > 1200) {
            kickDone = now
            robotPuPro.kick()
        }
        return
    }
    if (action == A_SIDE_STEP_LEFT) {
        now = input.runningTime()
        if (now - sideStepDone > 300) {
            sideStepDone = now
            robotPuPro.sideStep(1)
        }
        return
    }
    if (action == A_SIDE_STEP_RIGHT) {
        now = input.runningTime()
        if (now - sideStepDone > 300) {
            sideStepDone = now
            robotPuPro.sideStep(-1)
        }
        return
    }
    if (action == A_STOP) {
        followSpeed = 0
        followTurn = 0
    } else if (action == A_BACKWARD) {
        followSpeed = -2
        followTurn = 0
    } else if (action == A_INC_SPEED_GAIN) {
        speedGain = Math.min(1.0, speedGain + 0.05)
    } else if (action == A_DEC_SPEED_GAIN) {
        speedGain = Math.max(0.05, speedGain - 0.05)
    }
    // A_FORWARD is a no-op: just keep using the current gains

    if (robotPuCap.objectDetected(robotPuCap.CapObject.Ball)) {
        followSpeed = Math.max(-6, Math.min(6, (ballY - distance) * speedGain))
        followTurn = 0.8 * followTurn + 0.2 * Math.max(-1, Math.min(1, ballYaw * turnGain))
    }
    robotPuPro.walk(followSpeed, followTurn)
}

// Reward the new state reached after taking an action.
function reward(newState: number): number {
    let r = 0
    if (newState & 1) {
        r += 1
    }
    if (newState & 16) {
        r += 2
    }
    if (newState & 2) {
        r += 5
    }
    if (newState & 4) {
        r -= 3
    }
    if (newState & 8) {
        r -= 3
    }
    if (newState & 32) {
        r -= 2
    }
    if (!(newState & 1)) {
        r -= 5
    }
    return r
}

// Update the Q-table for the previous (state, action) pair.
// Give kicking a special bonus so the robot does not unlearn to kick.
function learn(state: number, action: number, newState: number) {
    let r = reward(newState)
    if (action == A_KICK && (state & 2)) {
        r += 15
    }
    if (r != 0) {
        let old = robotPuCap.getQValue(state, action)
        robotPuCap.setQValue(state, action, old + r)
    }
}

robotPuCap.startCogniCap()
robotPuCap.enableDetections([robotPuCap.CapObject.Ball])
robotPuCap.resetQTable()
robotPuPro.setServoTrim(0, -7)
robotPuPro.setServoTrim(1, 0)
robotPuPro.setServoTrim(2, -5)
robotPuPro.setServoTrim(3, 0)
robotPuPro.setServoTrim(4, -9)
robotPuPro.setServoTrim(5, 0)

// Pre-train the Q-table so the robot starts with a sensible soccer policy.
function train() {
    // Defaults: follow the ball if it is seen, back up if it is lost
    for (let s = 0; s < 64; s++) {
        if (s & 1) {
            robotPuCap.setQValue(s, A_FORWARD, 5)
        } else {
            robotPuCap.setQValue(s, A_BACKWARD, 5)
        }
    }
    // Far-left or far-right: side step toward the ball
    for (let s = 0; s < 64; s++) {
        if (s & 4) {
            robotPuCap.setQValue(s, A_SIDE_STEP_LEFT, 10)
        }
        if (s & 8) {
            robotPuCap.setQValue(s, A_SIDE_STEP_RIGHT, 10)
        }
        if (s & 32) {
            robotPuCap.setQValue(s, A_DEC_SPEED_GAIN, 12)
        }
    }
    // Kick when in kick range and in front
    robotPuCap.setQValue(1 + 2 + 16, A_KICK, 20)
    // Slow down extra when close and wobbling
    robotPuCap.setQValue(1 + 2 + 16 + 32, A_DEC_SPEED_GAIN, 15)
}
train()

basic.forever(function () {
    let s = stateId()
    learn(lastState, lastAction, s)
    let best = robotPuCap.getBestAction(s)
    act(best)
    robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, smoothPitch + 10)
    lastState = s
    lastAction = best
    basic.pause(10)
})
```

### How the loop works

1. `stateId()` looks at the camera and the accelerometer, then packs the events into a 6-bit number.
2. `learn(lastState, lastAction, s)` rewards the previous action for getting us to `s`.
3. `getBestAction(s)` picks the action with the highest reward for the current state.
4. `act(best)` applies the chosen mode or gain tweak.
5. `robotPuPro.walk(followSpeed, followTurn)` moves the robot, or `sideStep`/`kick` take over for one-time actions.
6. The head pitch is tilted down by `smoothPitch + 10` so the camera keeps a close ball in view.

### What to expect from the learning

The pre-trained values make the robot start with sensible behaviour:

- **Ball far left while stable** → side step left.
- **Ball far right while stable** → side step right.
- **Wobbling (`not_stable`)** → decrease `speedGain` to slow down.
- **Ball close, centered, and stable** → kick.

As the robot runs, the `learn` step updates the Q-table from the rewards it actually gets. If side stepping left consistently moves the ball to `ball_in_front`, the `A_SIDE_STEP_LEFT` Q-value rises. If slowing down reliably removes the `not_stable` flag, `A_DEC_SPEED_GAIN` becomes the preferred action in shaky states. You can watch this happen by logging the state and the chosen action.

## Tuning tips

- **The robot never kicks:** make sure `ball_in_kick_range` actually triggers. Lower the `ballY < 200` threshold or the `|ballYaw| < 20` threshold.
- **The robot does not side step:** check the yaw thresholds. If the camera reports yaw with the opposite sign, swap the `> 35` and `< -35` branches or swap the `sideStep(1)` / `sideStep(-1)` calls.
- **The robot is too shaky and not slowing down:** lower `stabilityThreshold` so `not_stable` triggers earlier, or increase the `A_DEC_SPEED_GAIN` pre-train value.
- **Q-table diverges:** reduce the reward step sizes or add a small discount when the Q-value gets very large.

## What to try next

- Add a `goal_detected` state bit and only reward the kick when the goal is visible.
- Replace one of the 8 actions with `turn left more` / `turn right more` and compare side-stepping versus turning.
- Log `lastState`, `best`, and `gVar` over USB to see when `not_stable` fires.
