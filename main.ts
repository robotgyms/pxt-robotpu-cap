/**
 * CogniCap add-on for Robot PU.
 * Adds ESP32-S3 based AI vision, voice control, Q-table RL, and high-level tracking/soccer helpers.
 */
//% weight=49 color=#9e2896 icon="\uf06e"
//% block="CogniCap"
//% groups='["Setup", "Vision", "Voice", "Learning", "Tracking", "Soccer", "I2C Callbacks"]'
//% helpUrl="https://robotgyms.com/pu/cognicap"
namespace robotPuCap {
    // I2C addresses
    const MUX_ADDR = 112;   // 0x70
    const ESP32_ADDR = 66;  // 0x42
    const SIZE = 18;

    // Event types from ESP32-S3
    const EVT_FACE = 0x01;
    const EVT_WAKE = 0x02;
    const EVT_VOICE = 0x03;
    const EVT_SOCCER_BALL = 0x04;
    const EVT_SOCCER_GOAL = 0x05;

    // Packet flags
    const VALID = 1 << 0;
    const STALE = 1 << 1;
    const CAPTURE = 1 << 2;
    const WEB = 1 << 3;
    const SLEEP = 1 << 4;

    // Service commands
    const CMD_SERVICE_ENABLE = 8;
    const SERVICE_WIFI = 1;
    const SERVICE_IMAGE_CAPTURE = 2;
    const SERVICE_FACE_DETECTION = 3;
    const SERVICE_SOCCER_BALL_DETECTION = 4;
    const SERVICE_SOCCER_GOAL_DETECTION = 5;

    // Packet parsing helpers
    function i16(buf: Buffer, offset: number): number {
        let v = buf[offset] | (buf[offset + 1] << 8);
        return v >= 32768 ? v - 65536 : v;
    }
    function u16(buf: Buffer, offset: number): number {
        return buf[offset] | (buf[offset + 1] << 8);
    }
    function i8(v: number): number {
        return v >= 128 ? v - 256 : v;
    }
    function clamp(v: number, lo: number, hi: number): number {
        return Math.min(hi, Math.max(lo, v));
    }

    /**
     * CogniCap detection objects.
     */
    export enum CapObject {
        //% block="face"
        Face = EVT_FACE,
        //% block="ball"
        Ball = EVT_SOCCER_BALL,
        //% block="goal"
        Goal = EVT_SOCCER_GOAL
    }

    /**
     * High-level actions the robot can learn.
     */
    export enum QAction {
        //% block="rest"
        Rest = 0,
        //% block="walk"
        Walk = 1,
        //% block="turn left"
        TurnLeft = 2,
        //% block="turn right"
        TurnRight = 3,
        //% block="dance"
        Dance = 4,
        //% block="kick"
        Kick = 5,
        //% block="search"
        Search = 6,
        //% block="approach"
        Approach = 7
    }

    class CogniCapPacket {
        type: number;
        ver: number;
        seq: number;
        flags: number;
        count: number;
        score: number;
        x_mm: number;
        y_mm: number;
        z_mm: number;
        w: number;
        h: number;
        yaw: number;
        pitch: number;
        fresh: boolean;
        rxTime: number;
        constructor() {
            this.type = 0;
            this.ver = 0;
            this.seq = 0;
            this.flags = 0;
            this.count = 0;
            this.score = 0;
            this.x_mm = 0;
            this.y_mm = 0;
            this.z_mm = 0;
            this.w = 0;
            this.h = 0;
            this.yaw = 0;
            this.pitch = 0;
            this.fresh = false;
            this.rxTime = 0;
        }
    }

    class CogniCap {
        enabled: boolean;
        packet: CogniCapPacket;
        constructor() {
            this.enabled = false;
            this.packet = new CogniCapPacket();
        }
        init() {
            // Open all 4 channels on the TCA9546A I2C mux
            pins.i2cWriteNumber(MUX_ADDR, 0x0F, NumberFormat.Int8LE, false);
            basic.pause(2000);
        }
        setService(id: number, on: boolean) {
            pins.i2cWriteBuffer(ESP32_ADDR, Buffer.fromArray([CMD_SERVICE_ENABLE, id, on ? 1 : 0]), false);
        }
        start() {
            this.enabled = true;
            let self = this;
            // Keep services enabled (camera reboots clear them)
            control.inBackground(function () {
                while (self.enabled) {
                    self.setService(SERVICE_IMAGE_CAPTURE, true);
                    basic.pause(10);
                    self.setService(SERVICE_FACE_DETECTION, true);
                    basic.pause(10);
                    self.setService(SERVICE_SOCCER_BALL_DETECTION, true);
                    basic.pause(10);
                    self.setService(SERVICE_SOCCER_GOAL_DETECTION, true);
                    basic.pause(30000);
                }
            });
            // Poll I2C packets
            control.inBackground(function () {
                while (self.enabled) {
                    self.read();
                    basic.pause(20);
                }
            });
        }
        stop() {
            this.enabled = false;
        }
        read() {
            let buf = pins.i2cReadBuffer(ESP32_ADDR, SIZE, false);
            if (buf.length == SIZE) {
                this.parse(buf);
                dispatch(this.packet.type);
            }
        }
        parse(buf: Buffer) {
            let p = this.packet;
            p.type = buf[0];
            p.ver = buf[1];
            p.seq = buf[2];
            p.flags = buf[3];
            p.count = buf[4];
            p.score = buf[5];
            p.x_mm = i16(buf, 6);
            p.y_mm = i16(buf, 8);
            p.z_mm = i16(buf, 10);
            p.w = u16(buf, 12);
            p.h = u16(buf, 14);
            p.yaw = i8(buf[16]);
            p.pitch = i8(buf[17]);
            p.fresh = (p.flags & VALID) != 0 && (p.flags & STALE) == 0;
            p.rxTime = input.runningTime();
        }
        detected(kind: number): boolean {
            return this.enabled && this.packet.type == kind && this.packet.count > 0 && this.packet.fresh;
        }
    }

    let cap: CogniCap;
    let running = false;
    function ensureCap(): CogniCap {
        if (!cap) {
            cap = new CogniCap();
            cap.init();
        }
        return cap;
    }

    // I2C callback registry
    let handlers: (() => void)[] = [];
    function dispatch(type: number): void {
        let handler = handlers[type];
        if (handler) {
            handler();
        }
    }

    /**
     * Run code when a selected object is detected.
     * @param object the object to watch for
     * @param handler the code to run
     */
    //% block="on %object detected"
    //% group="I2C Callbacks"
    //% handlerStatement=1
    export function onObjectDetected(object: CapObject, handler: () => void): void {
        handlers[object] = handler;
    }

    /**
     * Run code when an I2C message of the given type arrives.
     * @param type the message type byte (0-255)
     * @param handler the code to run
     */
    //% block="on i2c message type %type"
    //% type.min=0 type.max=255
    //% group="I2C Callbacks"
    //% handlerStatement=1
    export function onI2CMessage(type: number, handler: () => void): void {
        if (type < 0 || type > 255) return;
        handlers[type] = handler;
    }

    /**
     * X position from the latest I2C packet (mm).
     */
    //% block="last object x (mm)"
    //% group="I2C Callbacks"
    export function lastObjectX(): number { return cap ? cap.packet.x_mm : 0; }

    /**
     * Y position from the latest I2C packet (mm).
     */
    //% block="last object y (mm)"
    //% group="I2C Callbacks"
    export function lastObjectY(): number { return cap ? cap.packet.y_mm : 0; }

    /**
     * Z position from the latest I2C packet (mm).
     */
    //% block="last object z (mm)"
    //% group="I2C Callbacks"
    export function lastObjectZ(): number { return cap ? cap.packet.z_mm : 0; }

    /**
     * Width from the latest I2C packet (pixels).
     */
    //% block="last object width"
    //% group="I2C Callbacks"
    export function lastObjectWidth(): number { return cap ? cap.packet.w : 0; }

    /**
     * Height from the latest I2C packet (pixels).
     */
    //% block="last object height"
    //% group="I2C Callbacks"
    export function lastObjectHeight(): number { return cap ? cap.packet.h : 0; }

    /**
     * Yaw angle from the latest I2C packet (degrees).
     */
    //% block="last object yaw"
    //% group="I2C Callbacks"
    export function lastObjectYaw(): number { return cap ? cap.packet.yaw : 0; }

    /**
     * Pitch angle from the latest I2C packet (degrees).
     */
    //% block="last object pitch"
    //% group="I2C Callbacks"
    export function lastObjectPitch(): number { return cap ? cap.packet.pitch : 0; }

    /**
     * Message type from the latest I2C packet.
     */
    //% block="last message type"
    //% group="I2C Callbacks"
    export function lastMessageType(): number { return cap ? cap.packet.type : 0; }

    /**
     * Object count from the latest I2C packet.
     */
    //% block="last object count"
    //% group="I2C Callbacks"
    export function lastObjectCount(): number { return cap ? cap.packet.count : 0; }

    /**
     * Confidence from the latest I2C packet (0-255).
     */
    //% block="last object confidence"
    //% group="I2C Callbacks"
    export function lastObjectConfidence(): number { return cap ? cap.packet.score : 0; }

    /**
     * True if the latest I2C packet is fresh and valid.
     */
    //% block="last object valid"
    //% group="I2C Callbacks"
    export function lastObjectValid(): boolean { return cap ? cap.packet.fresh : false; }

    // Head tracking state
    let currentYaw = 0;
    let currentPitch = 0;
    function cacheHead() {
        let targets = robotPuPro.servoTargets();
        currentYaw = targets[4];
        currentPitch = targets[5];
    }

    // Q-table state
    let maxStates = 64;
    let maxActions = 8;
    let qTable: number[][] = [];

    /**
     * Reset the Q-table to all zeros.
     */
    //% block="reset Q-table"
    //% group="Learning"
    export function resetQTable(): void {
        qTable = [];
        for (let s = 0; s < maxStates; s++) {
            let row: number[] = [];
            for (let a = 0; a < maxActions; a++) {
                row.push(0);
            }
            qTable.push(row);
        }
    }

    function ensureQTable(): void {
        if (qTable.length === 0) {
            resetQTable();
        }
    }

    /**
     * Start the CogniCap co-processor and begin polling I2C packets.
     */
    //% block="start CogniCap"
    //% group="Setup"
    export function startCogniCap(): void {
        if (running) return;
        running = true;
        ensureCap().start();
    }

    /**
     * Stop CogniCap background loops.
     */
    //% block="stop CogniCap"
    //% group="Setup"
    export function stopCogniCap(): void {
        if (cap) cap.stop();
        running = false;
    }

    /**
     * Enable or disable a detection service on the ESP32-S3.
     * @param object the object service to toggle
     * @param enabled true to enable, false to disable
     */
    //% block="enable %object detection %enabled"
    //% group="Setup"
    export function enableDetection(object: CapObject, enabled: boolean): void {
        let c = ensureCap();
        let id = SERVICE_IMAGE_CAPTURE;
        if (object == EVT_FACE) id = SERVICE_FACE_DETECTION;
        else if (object == EVT_SOCCER_BALL) id = SERVICE_SOCCER_BALL_DETECTION;
        else if (object == EVT_SOCCER_GOAL) id = SERVICE_SOCCER_GOAL_DETECTION;
        c.setService(id, enabled);
    }

    /**
     * Return true when the selected object is currently detected and fresh.
     * @param object the object to check
     */
    //% block="%object detected"
    //% group="Vision"
    export function objectDetected(object: CapObject): boolean {
        return ensureCap().detected(object);
    }

    /**
     * X position of the detected object in millimetres (camera frame).
     * @param object the object to read
     */
    //% block="%object x (mm)"
    //% group="Vision"
    export function objectX(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.x_mm : 0;
    }

    /**
     * Y position of the detected object in millimetres (camera frame).
     * @param object the object to read
     */
    //% block="%object y (mm)"
    //% group="Vision"
    export function objectY(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.y_mm : 0;
    }

    /**
     * Width of the detected object box in pixels.
     * @param object the object to read
     */
    //% block="%object width"
    //% group="Vision"
    export function objectWidth(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.w : 0;
    }

    /**
     * Height of the detected object box in pixels.
     * @param object the object to read
     */
    //% block="%object height"
    //% group="Vision"
    export function objectHeight(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.h : 0;
    }

    /**
     * Yaw angle to the detected object in degrees.
     * @param object the object to read
     */
    //% block="%object yaw"
    //% group="Vision"
    export function objectYaw(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.yaw : 0;
    }

    /**
     * Pitch angle to the detected object in degrees.
     * @param object the object to read
     */
    //% block="%object pitch"
    //% group="Vision"
    export function objectPitch(object: CapObject): number {
        return ensureCap().detected(object) ? cap.packet.pitch : 0;
    }

    /**
     * Get the latest voice command string.
     */
    //% block="voice command"
    //% group="Voice"
    export function getVoiceCommand(): string {
        // Voice decoding is not implemented in the first skeleton.
        return "";
    }

    /**
     * Store a reward for a state-action pair.
     * @param state the state index
     * @param action the action index
     * @param reward the reward value
     */
    //% block="set Q reward state %state action %action reward %reward"
    //% group="Learning"
    export function setQValue(state: number, action: number, reward: number): void {
        if (state < 0 || state >= maxStates || action < 0 || action >= maxActions) return;
        ensureQTable();
        qTable[state][action] = reward;
    }

    /**
     * Read the current Q value for a state-action pair.
     * @param state the state index
     * @param action the action index
     */
    //% block="Q value state %state action %action"
    //% group="Learning"
    export function getQValue(state: number, action: number): number {
        if (state < 0 || state >= maxStates || action < 0 || action >= maxActions) return 0;
        ensureQTable();
        return qTable[state][action];
    }

    /**
     * Return the action with the highest Q value for a state.
     * @param state the state index
     */
    //% block="best Q action for state %state"
    //% group="Learning"
    export function getBestAction(state: number): number {
        if (state < 0 || state >= maxStates) return 0;
        ensureQTable();
        let best = 0;
        for (let a = 1; a < maxActions; a++) {
            if (qTable[state][a] > qTable[state][best]) {
                best = a;
            }
        }
        return best;
    }

    let faceYawLock = 0;
    let facePitchLock = 0;
    /**
     * Move the head so the detected face stays centred.
     */
    //% block="track face"
    //% group="Tracking"
    export function trackFace(): void {
        let c = ensureCap();
        cacheHead();
        if (c.detected(EVT_FACE)) {
            let p = c.packet;
            faceYawLock = (faceYawLock + p.yaw) * 0.5;
            facePitchLock = (facePitchLock + p.pitch) * 0.5;
            let nextYaw = clamp(currentYaw + faceYawLock * 0.08, -45, 45);
            let nextPitch = clamp(currentPitch + facePitchLock * 0.08, -45, 45);
            robotPuPro.setModeVar(robotPuPro.Mode.API);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, nextYaw, 8);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, nextPitch, 8);
            currentYaw = nextYaw;
            currentPitch = nextPitch;
            robotPuPro.leftEyeBright(0.01);
            robotPuPro.rightEyeBright(0.01);
        }
    }

    // Ball follow state
    let lastBallTime = 0;
    let ballYawLock = 0;
    let ballPitchLock = 0;
    let ballSpeed = 0;
    let ballTurn = 0;
    const LOST_TIMEOUT_MS = 6000;

    /**
     * Track the soccer ball with the head and compute walk speed/turn.
     * Use ballFollowSpeed() and ballFollowTurn() afterwards to drive the robot.
     */
    //% block="follow ball"
    //% group="Soccer"
    export function followBall(): void {
        let c = ensureCap();
        cacheHead();
        let now = input.runningTime();
        if (c.detected(EVT_SOCCER_BALL)) {
            lastBallTime = now;
            let p = c.packet;
            ballYawLock = (ballYawLock + p.yaw) * 0.5;
            ballPitchLock = (ballPitchLock + p.pitch) * 0.5;
            let nextYaw = clamp(currentYaw + ballYawLock * 0.08, -45, 45);
            let nextPitch = clamp(currentPitch + ballPitchLock * 0.08, -45, 45);
            robotPuPro.setModeVar(robotPuPro.Mode.API);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, nextYaw, 8);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, nextPitch, 8);
            currentYaw = nextYaw;
            currentPitch = nextPitch;
            robotPuPro.leftEyeBright(0.01);
            robotPuPro.rightEyeBright(0.01);
            // Stop about 150 mm from the ball; tune the gain for your field.
            ballSpeed = Math.max(-6, Math.min(6, (p.y_mm - 150) * 0.2));
            ballTurn = (ballTurn + Math.max(-1, Math.min(1, ballYawLock * -0.2))) * 0.5;
        } else if (now - lastBallTime < LOST_TIMEOUT_MS) {
            // Follow through briefly when the ball is temporarily out of view.
            ballSpeed *= 0.7;
            ballTurn *= 0.9;
            ballYawLock *= 0.7;
            ballPitchLock *= 0.7;
        } else {
            ballSpeed = 0;
            ballTurn = 0;
        }
    }

    /**
     * Current walk speed from the last followBall() update.
     */
    //% block="ball follow speed"
    //% group="Soccer"
    export function ballFollowSpeed(): number {
        return ballSpeed;
    }

    /**
     * Current walk turn from the last followBall() update.
     */
    //% block="ball follow turn"
    //% group="Soccer"
    export function ballFollowTurn(): number {
        return ballTurn;
    }

    // Head search pattern for lost ball
    const SEARCH_Y: number[] = [15, -15, -15, 0, 15, 15, 0, -15, -15, 0];
    const SEARCH_P: number[] = [0, 0, -10, -10, -10, 3, 3, 3, 0, 0];
    const SCAN_WAIT_FRAMES = 25;
    let scanIndex = 0;
    let scanCounter = 0;
    let searchGain = 1;

    /**
     * Scan the head through the search pattern to reacquire the ball.
     */
    //% block="search for ball"
    //% group="Soccer"
    export function searchForBall(): void {
        cacheHead();
        if (scanCounter > 0) {
            scanCounter -= 1;
            let y = SEARCH_Y[scanIndex] * searchGain;
            let p = SEARCH_P[scanIndex] * searchGain;
            robotPuPro.setModeVar(robotPuPro.Mode.API);
            let nextYaw = clamp(currentYaw + y, -45, 45);
            let nextPitch = clamp(currentPitch + p, -45, 45);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, nextYaw, 1);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, nextPitch, 1);
            currentYaw = nextYaw;
            currentPitch = nextPitch;
            return;
        }
        scanCounter = SCAN_WAIT_FRAMES;
        scanIndex += 1;
        if (scanIndex >= SEARCH_Y.length) {
            scanIndex = 0;
            searchGain = Math.min(4, searchGain * 1.1);
        }
    }
}
