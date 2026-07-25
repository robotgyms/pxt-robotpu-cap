/**
 * CogniCap add-on for Robot PU.
 * Adds ESP32-S3 based AI vision, voice control, and Q-table reinforcement learning.
 */
//% weight=49 color=#9e2896 icon="\uf06e"
//% block="CogniCap"
//% groups='["Setup", "Vision", "Voice", "Learning"]'
//% helpUrl="https://robotgyms.com/pu/cognicap"
namespace robotPuCap {
    let capEnabled = false;
    let lastVision = "";
    let lastVoice = "";

    let maxStates = 64;
    let maxActions = 8;
    let qTable: number[][] = [];

    /**
     * Kinds of objects CogniCap can report.
     */
    export enum DetectType {
        //% block="face"
        Face = 0,
        //% block="ball"
        Ball = 1,
        //% block="line"
        Line = 2,
        //% block="obstacle"
        Obstacle = 3
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
     * Start the CogniCap co-processor.
     */
    //% block="start CogniCap"
    //% group="Setup"
    export function startCogniCap(): void {
        capEnabled = true;
        lastVision = "";
        lastVoice = "";
        // TODO: initialise UART/I2C to ESP32-S3
    }

    /**
     * Stop the CogniCap co-processor.
     */
    //% block="stop CogniCap"
    //% group="Setup"
    export function stopCogniCap(): void {
        capEnabled = false;
    }

    /**
     * Return true when an object of the chosen type is detected.
     * @param type the kind of object to look for
     */
    //% block="vision detected %type"
    //% group="Vision"
    export function visionDetected(type: DetectType): boolean {
        if (!capEnabled) return false;
        // TODO: read detection result from ESP32-S3
        return lastVision.indexOf(String(type)) >= 0;
    }

    /**
     * Get the latest voice command string.
     */
    //% block="voice command"
    //% group="Voice"
    export function getVoiceCommand(): string {
        if (!capEnabled) return "";
        // TODO: read voice result from ESP32-S3
        return lastVoice;
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
}
