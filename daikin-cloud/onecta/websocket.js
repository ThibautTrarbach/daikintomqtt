"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const node_events_1 = require("node:events");
const constants_1 = require("../constants");
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 300000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 50;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;
const CONNECTION_TIMEOUT = 30000;
class DaikinWebSocket extends node_events_1.EventEmitter {
    oauth;
    onError;
    ws = null;
    state = 'disconnected';
    reconnectDelay = INITIAL_RECONNECT_DELAY;
    reconnectTimeout = null;
    pingInterval = null;
    pongTimeout = null;
    shouldReconnect = true;
    connectionAttempts = 0;
    constructor(oauth, onError) {
        super();
        this.oauth = oauth;
        this.onError = onError;
    }
    getState() {
        return this.state;
    }
    isConnected() {
        return this.state === 'connected' && this.ws?.readyState === ws_1.default.OPEN;
    }
    async connect() {
        if (this.state === 'connected' || this.state === 'connecting') {
            return;
        }
        this.shouldReconnect = true;
        await this.establishConnection();
    }
    disconnect() {
        this.shouldReconnect = false;
        this.cleanup();
        this.state = 'disconnected';
        this.emit('disconnected', { reconnecting: false });
    }
    async establishConnection() {
        this.state = 'connecting';
        this.connectionAttempts++;
        try {
            const accessToken = await this.oauth.getAccessToken();
            this.ws = new ws_1.default(constants_1.DAIKIN_WEBSOCKET_URL, {
                headers: { Authorization: `Bearer ${accessToken}` },
                handshakeTimeout: CONNECTION_TIMEOUT,
            });
            this.setupEventHandlers();
        }
        catch (error) {
            this.handleError(error);
            this.scheduleReconnect();
        }
    }
    setupEventHandlers() {
        if (!this.ws) {
            return;
        }
        this.ws.on('open', () => {
            this.state = 'connected';
            this.reconnectDelay = INITIAL_RECONNECT_DELAY;
            this.connectionAttempts = 0;
            this.startHeartbeat();
            this.emit('connected');
        });
        this.ws.on('message', (data) => {
            this.handleMessage(data);
        });
        this.ws.on('close', (code, reason) => {
            this.handleClose(code, reason.toString());
        });
        this.ws.on('error', (error) => {
            this.handleError(error);
        });
        this.ws.on('pong', () => {
            this.clearPongTimeout();
        });
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            if (message.message === 'Internal server error') {
                return;
            }
            if (message.event === 'gateway:managementpoint:characteristic') {
                const event = message;
                this.emit('device_update', {
                    deviceId: event.gatewayDeviceId,
                    embeddedId: event.embeddedId,
                    managementPointId: event.managementPointId,
                    characteristicName: event.data.name,
                    data: event.data,
                });
            }
        }
        catch {
        }
    }
    handleClose(code, reason) {
        this.cleanup();
        if (this.shouldReconnect) {
            this.state = 'reconnecting';
            this.emit('disconnected', { code, reason, reconnecting: true });
            this.scheduleReconnect();
        }
        else {
            this.state = 'disconnected';
            this.emit('disconnected', { code, reason, reconnecting: false });
        }
    }
    handleError(error) {
        this.onError?.(error);
        this.emit('error', error);
    }
    scheduleReconnect() {
        if (!this.shouldReconnect) {
            return;
        }
        if (this.connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
            this.state = 'disconnected';
            this.handleError(new Error(`WebSocket gave up after ${MAX_RECONNECT_ATTEMPTS} consecutive reconnection attempts`));
            this.emit('disconnected', { reconnecting: false });
            return;
        }
        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            try {
                await this.establishConnection();
            }
            catch (error) {
                this.handleError(error);
                this.scheduleReconnect();
            }
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER, MAX_RECONNECT_DELAY);
    }
    startHeartbeat() {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === ws_1.default.OPEN) {
                this.ws.ping();
                this.setPongTimeout();
            }
        }, PING_INTERVAL);
    }
    stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.clearPongTimeout();
    }
    setPongTimeout() {
        this.clearPongTimeout();
        this.pongTimeout = setTimeout(() => {
            this.ws?.terminate();
        }, PONG_TIMEOUT);
    }
    clearPongTimeout() {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }
    cleanup() {
        this.stopHeartbeat();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === ws_1.default.OPEN || this.ws.readyState === ws_1.default.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }
    }
}
exports.DaikinWebSocket = DaikinWebSocket;
//# sourceMappingURL=websocket.js.map