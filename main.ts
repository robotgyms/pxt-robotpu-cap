/**
 * CogniCap add-on for Robot PU.
 * Adds ESP32-S3 based AI vision, voice control, Q-table RL, and high-level tracking/soccer helpers.
 */
//% weight=49 color=#9e2896 icon="\uf06e"
//% block="CogniCap"
//% groups='["Setup", "Vision", "Voice", "Action", "AI", "I2C Callbacks"]'
//% helpUrl="https://robotgyms.com/pu/cognicap"
namespace robotPuCap {
    // I2C addresses
    const MUX_ADDR = 112;   // 0x70
    const ESP32_ADDR = 66;  // 0x42
    const SIZE = 18;

    // Message type segments
    const EVT_IDLE = 0x00;        // 0x00-0x0F status / action / device
    const EVT_ACTION = 0x01;
    const EVT_WIFI = 0x02;
    const EVT_WEBSITE = 0x03;
    const EVT_CAMERA = 0x04;
    const EVT_POWER = 0x04;
    const EVT_ROBOT = 0x05;
    const EVT_VOICE = 0x10;       // 0x10-0x1F voice / audio
    const EVT_WAKE = 0x11;
    const EVT_FACE = 0x20;        // 0x20-0xFF vision / detection
    const EVT_SOCCER_BALL = 0x21;
    const EVT_SOCCER_GOAL = 0x22;

    // Packet flags
    const VALID = 1 << 0;
    const STALE = 1 << 1;
    const CAPTURE = 1 << 2;
    const WEB = 1 << 3;
    const SLEEP = 1 << 4;

    // Service enable protocol
    const CMD_SERVICE_ENABLE = 8;
    const SVC_OFF = 0;
    const SVC_ON = 1;
    const SVC_ERR = 2;
    const KNOWN_SERVICES = [EVT_WIFI, EVT_CAMERA, EVT_VOICE, EVT_FACE, EVT_SOCCER_BALL, EVT_SOCCER_GOAL];

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

    /**
     * Voice / action tokens issued by the ESP32-S3.
     */
    export enum VoiceAction {
        //% block="rest"
        Rest = 1,
        //% block="go"
        Go = 2,
        //% block="back"
        Back = 3,
        //% block="stop"
        Stop = 4,
        //% block="jump"
        Jump = 5,
        //% block="kick"
        Kick = 6,
        //% block="sing"
        Sing = 7,
        //% block="talk"
        Talk = 8,
        //% block="dance"
        Dance = 9,
        //% block="left"
        Left = 10,
        //% block="right"
        Right = 11,
        //% block="straight"
        Straight = 12,
        //% block="wakeup"
        Wakeup = 13
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
        valid: boolean;
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
            this.valid = false;
            this.rxTime = 0;
        }
    }

    class CogniCap {
        enabled: boolean;
        packet: CogniCapPacket;
        serviceStatus: number[];

        constructor() {
            this.enabled = false;
            this.packet = new CogniCapPacket();
            this.serviceStatus = [];
        }
        init() {
            // Open all 4 channels on the TCA9546A I2C mux
            pins.i2cWriteNumber(MUX_ADDR, 0x0F, NumberFormat.Int8LE, false);
            basic.pause(2000);
        }
        setService(type: number, on: boolean) {
            this.serviceStatus[type] = on ? SVC_ON : SVC_OFF;
            pins.i2cWriteBuffer(ESP32_ADDR, Buffer.fromArray([CMD_SERVICE_ENABLE, type, on ? 1 : 0]), false);
        }
        start() {
            this.enabled = true;
            let self = this;
            // Keep enabled services running (camera reboots clear them)
            control.inBackground(function () {
                while (self.enabled) {
                    for (let i = 0; i < KNOWN_SERVICES.length; i++) {
                        let svc = KNOWN_SERVICES[i];
                        if (self.serviceStatus[svc] == SVC_OFF) {
                            self.setService(svc, false);
                        } else {
                            self.setService(svc, true);
                        }
                        basic.pause(i == KNOWN_SERVICES.length - 1 ? 30000 : 500);
                    }
                }
            });
            // Poll I2C packets
            control.inBackground(function () {
                while (self.enabled) {
                    // read data from ESP32-S3
                    self.read();
                    // Sample microphone for attention sound spikes
                    if (input.soundLevel() > attSoundThreshold) {
                        attentionCount[ATT_SOUND] = (attentionCount[ATT_SOUND] || 0) + 1;
                    }
                    basic.pause(20);
                }
            });
            // decay all attention counters
            control.inBackground(function () {
                while (self.enabled) {
                    for (let i = 0; i < ATTENTION_TYPES.length; i++) {
                        let t = ATTENTION_TYPES[i];
                        attentionCount[t] = (attentionCount[t] || 0) * ATTENTION_DECAY;
                    }
                    basic.pause(1000);
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
                let p = this.packet;
                if (p.seq != attLastPacketSeq[p.type]) {
                    attLastPacketSeq[p.type] = p.seq;
                    if (ATTENTION_TYPES.indexOf(p.type) >= 0) {
                        let add = p.type == EVT_VOICE ? 1 : p.count;
                        attentionCount[p.type] = (attentionCount[p.type] || 0) + add;
                    }
                }
                if (p.type < 0x20 && p.type != EVT_IDLE) {
                    if (lastEventSeq[p.type] === p.seq) return;
                    lastEventSeq[p.type] = p.seq;
                }
                dispatch(p.type, p.count);
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
            p.x_mm = p.y_mm = p.z_mm = p.w = p.h = p.yaw = p.pitch = 0;
            if (p.type >= 0x20) {
                p.x_mm = i16(buf, 6);
                p.y_mm = i16(buf, 8);
                p.z_mm = i16(buf, 10);
                p.w = u16(buf, 12);
                p.h = u16(buf, 14);
                p.yaw = i8(buf[16]);
                p.pitch = i8(buf[17]);
            }
            // set fresh if the sequence number is different
            p.valid = (p.flags & VALID) != 0;
            p.rxTime = input.runningTime();
        }
        detected(kind: number): boolean {
            return this.enabled && this.packet.type == kind && this.packet.count > 0 && this.packet.valid;
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
    let actionHandlers: (() => void)[] = [];
    let lastEventSeq: number[] = [];
    function isActionToken(type: number): boolean {
        return type == EVT_ACTION || type == EVT_VOICE;
    }

    function dispatch(type: number, token: number = 0): void {
        let handler = handlers[type];
        if (handler) handler();
        if (isActionToken(type)) {
            let ah = actionHandlers[token];
            if (ah) ah();
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
    export function lastObjectValid(): boolean { return cap ? cap.packet.valid : false; }

    /**
     * Print the latest I2C packet to serial.
     */
    //% block="print i2c packet"
    //% group="I2C Callbacks"
    export function printI2CPacket(): void {
        if (!cap) return;
        let p = cap.packet;
        if (p.type >= 0x20) {
            serial.writeLine(
                "obj type=" + p.type + " ver=" + p.ver + " seq=" + p.seq +
                " flags=" + p.flags + " count=" + p.count + " score=" + p.score +
                " x_mm=" + p.x_mm + " y_mm=" + p.y_mm + " z_mm=" + p.z_mm +
                " w=" + p.w + " h=" + p.h +
                " yaw=" + p.yaw + " pitch=" + p.pitch
            );
        } else {
            serial.writeLine(
                "tok type=" + p.type + " ver=" + p.ver + " seq=" + p.seq +
                " flags=" + p.flags + " token=" + p.count + " score=" + p.score
            );
        }
    }

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

    // Attention-attractor state
    let attSoundThreshold = 120;
    let attExplorePercent = 25;
    // Attention counters keyed by event type (EVT_VOICE, EVT_WAKE, EVT_FACE, EVT_SOCCER_BALL, EVT_SOCCER_GOAL) plus sound
    const ATT_SOUND = 0x30;
    const ATTENTION_TYPES = [EVT_VOICE, EVT_WAKE, EVT_FACE, EVT_SOCCER_BALL, EVT_SOCCER_GOAL, ATT_SOUND];
    const ATTENTION_DECAY = 0.68;
    let attentionCount: number[] = [];
    let attLastState = -1;
    let attLastAction = -1;
    let attLastPacketSeq: number[] = [];

    /**
     * Reset the Q-table to all zeros.
     */
    //% block="reset Q-table"
    //% group="AI"
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
        ensureCap().setService(object, enabled);
    }

    /**
     * Enable only the selected detection services and turn off all other object detections
     * to save ESP32-S3 processing power.
     * @param objects the CapObject detections to keep enabled
     */
    //% block="enable detections %objects"
    //% objects.shadow="lists_create_with"
    //% group="Setup"
    export function enableDetections(objects: CapObject[]): void {
        let all = [CapObject.Face, CapObject.Ball, CapObject.Goal];
        let c = ensureCap();
        for (let i = 0; i < all.length; i++) {
            let o = all[i];
            c.setService(o, objects.indexOf(o) >= 0);
        }
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

    function objectField(object: CapObject, getter: () => number): number {
        ensureCap();
        return cap.detected(object) ? getter() : 0;
    }

    /**
     * X position of the detected object in millimetres (camera frame).
     * @param object the object to read
     */
    //% block="%object x (mm)"
    //% group="Vision"
    export function objectX(object: CapObject): number {
        return objectField(object, () => cap.packet.x_mm);
    }

    /**
     * Y position of the detected object in millimetres (camera frame).
     * @param object the object to read
     */
    //% block="%object y (mm)"
    //% group="Vision"
    export function objectY(object: CapObject): number {
        return objectField(object, () => cap.packet.y_mm);
    }

    /**
     * Width of the detected object box in pixels.
     * @param object the object to read
     */
    //% block="%object width"
    //% group="Vision"
    export function objectWidth(object: CapObject): number {
        return objectField(object, () => cap.packet.w);
    }

    /**
     * Height of the detected object box in pixels.
     * @param object the object to read
     */
    //% block="%object height"
    //% group="Vision"
    export function objectHeight(object: CapObject): number {
        return objectField(object, () => cap.packet.h);
    }

    /**
     * Yaw angle to the detected object in degrees.
     * @param object the object to read
     */
    //% block="%object yaw"
    //% group="Vision"
    export function objectYaw(object: CapObject): number {
        return objectField(object, () => cap.packet.yaw);
    }

    /**
     * Pitch angle to the detected object in degrees.
     * @param object the object to read
     */
    //% block="%object pitch"
    //% group="Vision"
    export function objectPitch(object: CapObject): number {
        return objectField(object, () => cap.packet.pitch);
    }

    // Voice / action token name table
    const VOICE_NAMES = [
        "", "rest", "go", "back", "stop", "jump", "kick", "sing", "talk", "dance", "left", "right", "straight", "wakeup"
    ];

    /**
     * Get the latest action-token name as a string (e.g. "go", "straight").
     */
    //% block="voice command"
    //% group="Voice"
    export function getVoiceCommand(): string {
        let t = lastActionToken();
        return t >= 0 && t < VOICE_NAMES.length ? VOICE_NAMES[t] : "";
    }

    /**
     * Latest action token value from the last I2C action message (0-255).
     */
    //% block="last action token"
    //% group="Voice"
    export function lastActionToken(): number {
        return cap && isActionToken(cap.packet.type) && cap.packet.valid ? cap.packet.count : 0;
    }

    /**
     * Run code when a wake word is detected.
     * @param handler the code to run
     */
    //% block="on wake word"
    //% group="Voice"
    //% handlerStatement=1
    export function onWakeWord(handler: () => void): void {
        handlers[EVT_WAKE] = handler;
    }

    /**
     * Run code when a voice action token is received.
     * @param action the action token to watch for
     * @param handler the code to run
     */
    //% block="on voice action %action"
    //% group="Voice"
    //% handlerStatement=1
    export function onVoiceAction(action: VoiceAction, handler: () => void): void {
        actionHandlers[action] = handler;
    }

    /**
     * Enable or disable the MultiNet/mock voice command service on the ESP32-S3.
     * @param enabled true to enable, false to disable
     */
    //% block="enable voice commands %enabled"
    //% group="Setup"
    export function enableVoiceCommands(enabled: boolean): void {
        ensureCap().setService(EVT_VOICE, enabled);
    }

    /**
     * Store a reward for a state-action pair.
     * @param state the state index
     * @param action the action index
     * @param reward the reward value
     */
    //% block="set Q reward state %state action %action reward %reward"
    //% group="AI"
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
    //% group="AI"
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
    //% group="AI"
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

    /**
     * Set the sound-level threshold for counting attention spikes.
     * @param threshold sound level 0..255
     */
    //% block="set attention sound threshold %threshold"
    //% threshold.min=0 threshold.max=255
    //% group="AI"
    export function setAttentionSoundThreshold(threshold: number): void {
        attSoundThreshold = threshold;
    }

    /**
     * Set the chance (0..100) of picking a random action instead of the best one.
     * @param percent exploration percentage
     */
    //% block="set attention explore %percent"
    //% percent.min=0 percent.max=100
    //% group="AI"
    export function setAttentionExplore(percent: number): void {
        attExplorePercent = clamp(percent, 0, 100);
    }

    /**
     * Reset attention counters.
     */
    //% block="reset attention counters"
    //% group="AI"
    export function resetAttentionCounters(): void {
        for (let i = 0; i < ATTENTION_TYPES.length; i++) {
            attentionCount[ATTENTION_TYPES[i]] = 0;
        }
    }

    /**
     * Return the current attention state (0..7) from face, voice and sound activity.
     */
    //% block="attention state"
    //% group="AI"
    export function attentionState(): number {
        let s = 0;
        if ((attentionCount[EVT_FACE] || 0) > 0) s |= 1;
        if ((attentionCount[EVT_VOICE] || 0) + (attentionCount[EVT_WAKE] || 0) > 0) s |= 2;
        if ((attentionCount[ATT_SOUND] || 0) > 0) s |= 4;
        return s;
    }

    /**
     * Return a reward score based on the current attention counters.
     */
    //% block="attention reward"
    //% group="AI"
    export function attentionReward(): number {
        return (attentionCount[EVT_FACE] || 0) + ((attentionCount[EVT_VOICE] || 0) + (attentionCount[EVT_WAKE] || 0)) * 2 + (attentionCount[ATT_SOUND] || 0);
    }

    /**
     * Update the Q-table with the reward for the last action, then pick the best
     * attention action for the current state and return it.
     */
    //% block="attention action"
    //% group="AI"
    export function attentionAction(): number {
        ensureQTable();
        let s = attentionState();
        let reward = attentionReward();
        if (attLastState >= 0 && attLastAction >= 0) {
            let old = getQValue(attLastState, attLastAction);
            setQValue(attLastState, attLastAction, old + reward);
        }
        resetAttentionCounters();
        let a = getBestAction(s);
        if (Math.randomRange(0, 99) < attExplorePercent) {
            a = Math.randomRange(0, maxActions - 1);
        }
        attLastState = s;
        attLastAction = a;
        return a;
    }

    // Generic object tracking state (indexed by CapObject enum value)
    let trackYawLocks: number[] = [];
    let trackPitchLocks: number[] = [];

    function moveHead(yawDelta: number, pitchDelta: number, brightEyes: boolean) {
        let nextYaw = clamp(currentYaw + yawDelta, -45, 45);
        let nextPitch = clamp(currentPitch + pitchDelta, -45, 45);
        robotPuPro.setMode(robotPuPro.Mode.API);
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, nextYaw, 8);
        robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, nextPitch, 8);
        currentYaw = nextYaw;
        currentPitch = nextPitch;
        if (brightEyes) {
            robotPuPro.leftEyeBright(0.01);
            robotPuPro.rightEyeBright(0.01);
        }
    }

    /**
     * Move the head so the selected object stays centred.
     * @param object the object to track
     * @param trackGain position offset gain
     * @param trackSpeed servo step speed
     */
    //% block="head track %object gain %trackGain speed %trackSpeed"
    //% trackGain.defl=0.3 trackSpeed.defl=0.16
    //% group="Action"
    export function headTrackObject(object: CapObject,
                                    trackGain: number = 0.3, trackSpeed: number = 0.16): void {
        let c = ensureCap();
        if (c.detected(object)) {
            let yaw = c.packet.yaw;
            let pitch = c.packet.pitch;
            let smoothYaw = trackYawLocks[object] || 0;
            let smoothPitch = trackPitchLocks[object] || 0;
            smoothYaw = 0.5 * smoothYaw + 0.5 * yaw;
            smoothPitch = 0.5 * smoothPitch + 0.5 * pitch;
            trackYawLocks[object] = smoothYaw;
            trackPitchLocks[object] = smoothPitch;
            robotPuPro.leftEyeBright(0.05);
            robotPuPro.rightEyeBright(0.05);
            let targets = robotPuPro.servoTargets();
            let currentYaw = targets[4];
            let currentPitch = targets[5];
            robotPuPro.setMode(robotPuPro.Mode.API);
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadYaw, currentYaw + smoothYaw * trackGain, Math.max(0.5, Math.abs(smoothYaw * trackSpeed)));
            robotPuPro.servoStep(robotPuPro.ServoJoint.HeadPitch, currentPitch + smoothPitch * trackGain, Math.max(0.5, Math.abs(smoothPitch * trackSpeed)));
        }
    }

    // Generic object follow state
    let followLastTime = 0;
    let followSpeed = 0;
    let followTurn = 0;
    let LOST_TIMEOUT_MS = 3000;

    /**
     * Track an object with the head and compute walk speed/turn for the target distance.
     * @param object the object to follow
     * @param distance target distance to the object in millimetres
     * @param speedGain multiplier for forward speed based on distance error
     * @param turnGain multiplier for turning based on yaw error
     * @param decay follow-through decay multiplier while the object is temporarily out of view
     */
    //% block="follow %object at distance %distance mm speed gain %speedGain turn gain %turnGain decay %decay"
    //% group="Action"
    //% distance.defl=150
    //% speedGain.min=0.001 speedGain.max=2 speedGain.defl=0.4
    //% turnGain.min=-1 turnGain.max=1 turnGain.defl=-0.2
    //% decay.min=0.001 decay.max=1 decay.defl=0.76
    export function followObject(object: CapObject, distance: number, speedGain: number = 0.4, turnGain: number = -0.2, decay: number = 0.76): void {
        let c = ensureCap();
        let now = input.runningTime();
        let p = trackPitchLocks[object] || 0;
        let y = trackYawLocks[object] || 0;
        if (c.detected(object)) {
            followLastTime = now;
            y = 0.9 * y + 0.1 * c.packet.yaw;
            p = 0.9 * p + 0.1 * c.packet.pitch;
            trackYawLocks[object] = y;
            trackPitchLocks[object] = p;
            robotPuPro.leftEyeBright(0.01);
            robotPuPro.rightEyeBright(0.01);
            followSpeed = Math.max(-6, Math.min(6, (c.packet.y_mm - distance) * speedGain));
            followTurn = 0.8 * followTurn + 0.2 * Math.max(-1, Math.min(1, y * turnGain));
        } else if (now - followLastTime < LOST_TIMEOUT_MS) {
            // Follow through briefly when the object is temporarily out of view.
            y = y * decay;
            p = p * decay;
            trackYawLocks[object] = y;
            trackPitchLocks[object] = p;
            followSpeed = followSpeed * decay;
            followTurn = followTurn * decay;
        } else {
            // Back up to avoid overshooting.
            followSpeed = -2;
        }
        // fine-tune head pitch to keep the object in the center
        robotPuPro.setServoTrim(robotPuPro.ServoJoint.HeadPitch, p);
        robotPuPro.walk(followSpeed, followTurn);
    }

    // Head search pattern for lost object
    const SEARCH_Y: number[] = [15, -15, -15, 0, 15, 15, 0, -15, -15, 0];
    const SEARCH_P: number[] = [0, 0, -10, -10, -10, 3, 3, 3, 0, 0];
    const SCAN_WAIT_FRAMES = 25;
    let scanIndex = 0;
    let scanCounter = 0;
    let searchGain = 1;

    /**
     * Scan the head through the search pattern to reacquire an object.
     * @param object the object to search for
     */
    //% block="search for %object"
    //% group="Action"
    export function searchForObject(object: CapObject): void {
        cacheHead();
        if (scanCounter > 0) {
            scanCounter -= 1;
            let y = SEARCH_Y[scanIndex] * searchGain;
            let p = SEARCH_P[scanIndex] * searchGain;
            robotPuPro.setMode(robotPuPro.Mode.API);
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
