robotPuCap.startCogniCap();

// 1. Face detection demo
if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
    basic.showIcon(IconNames.Happy);
    basic.showNumber(robotPuCap.objectX(robotPuCap.CapObject.Face));
}

// 2. Face tracking loop
basic.forever(function () {
    robotPuCap.trackFace();
    basic.pause(20);
});

// 3. Ball following
basic.forever(function () {
    robotPuCap.followBall();
    robotPuPro.walk(robotPuCap.ballFollowSpeed(), robotPuCap.ballFollowTurn());
    basic.pause(5);
});

// 4. Simple robot soccer behavior
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

// 5. Q-learning sample
robotPuCap.resetQTable();
robotPuCap.setQValue(0, robotPuCap.QAction.Walk, 1);
let best = robotPuCap.getBestAction(0);
basic.showNumber(best);
