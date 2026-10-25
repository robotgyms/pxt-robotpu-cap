robotPuCap.startCogniCap();

// 0. Event handlers (top-level hat blocks)
robotPuCap.onObjectDetected(robotPuCap.CapObject.Face, function () {
    robotPuPro.start(robotPuPro.Action.Jump, 2);
});
robotPuCap.onVoiceAction(robotPuCap.VoiceAction.Rest, function () {
    robotPuPro.start(robotPuPro.Action.Rest, 0);
});
robotPuCap.onWakeWord(function () {
    basic.showIcon(IconNames.Surprised);
});
robotPuCap.onVoiceCommand(function () {
    basic.showNumber(robotPuCap.lastVoiceCommand());
});
robotPuCap.onI2CMessage(0x20, function () {
    basic.showNumber(robotPuCap.lastActionToken());
});

// 1. Face detection demo
if (robotPuCap.objectDetected(robotPuCap.CapObject.Face)) {
    basic.showIcon(IconNames.Happy);
    basic.showNumber(robotPuCap.objectX(robotPuCap.CapObject.Face));
}

// 2. Face tracking loop
basic.forever(function () {
    robotPuCap.headTrackObject(robotPuCap.CapObject.Face, 0.2, 0.2);
    basic.pause(20);
});

// 3. Ball following
basic.forever(function () {
    robotPuCap.followObject(robotPuCap.CapObject.Ball, 150, 0.4, -0.2);
    basic.pause(5);
});

// 4. Simple robot soccer behavior
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

// 5. Q-learning sample
robotPuCap.resetQTable();
robotPuCap.setQValue(0, robotPuCap.QAction.Walk, 1);
let best = robotPuCap.getBestAction(0);
basic.showNumber(best);

// 5b. Q-table guards: invalid indices must not crash
robotPuCap.setQValue(-1, 0, 5);            // out-of-range state: ignored
robotPuCap.setQValue(0, 8, 5);             // out-of-range action: ignored
let qBad = robotPuCap.getQValue(64, 0);    // returns 0
let bestBad = robotPuCap.getBestAction(-1);// returns 0
basic.showNumber(qBad + bestBad);
