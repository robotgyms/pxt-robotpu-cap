robotPuCap.startCogniCap();

if (robotPuCap.visionDetected(robotPuCap.DetectType.Face)) {
    basic.showIcon(IconNames.Happy);
}

let cmd = robotPuCap.getVoiceCommand();
if (cmd == "go") {
    basic.showString("GO");
}

robotPuCap.resetQTable();
robotPuCap.setQValue(0, robotPuCap.QAction.Walk, 1);
let best = robotPuCap.getBestAction(0);
basic.showNumber(best);
