/**
 * Daikin WebSocket client — ported from mp-consulting/homebridge-daikin-cloud
 */

import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import type { OAuthProvider, WebSocketDeviceUpdate } from '../types';
import { DAIKIN_WEBSOCKET_URL } from '../constants';

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 300000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 50;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;
const CONNECTION_TIMEOUT = 30000;

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface GatewayCharacteristicEvent {
	event: 'gateway:managementpoint:characteristic';
	gatewayDeviceId: string;
	embeddedId: string;
	managementPointId: string;
	data: WebSocketDeviceUpdate['data'];
}

export class DaikinWebSocket extends EventEmitter {
	private ws: WebSocket | null = null;
	private state: WebSocketState = 'disconnected';
	private reconnectDelay = INITIAL_RECONNECT_DELAY;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private pingInterval: NodeJS.Timeout | null = null;
	private pongTimeout: NodeJS.Timeout | null = null;
	private shouldReconnect = true;
	private connectionAttempts = 0;

	constructor(
		private readonly oauth: OAuthProvider,
		private readonly onError?: (error: Error) => void,
	) {
		super();
	}

	getState(): WebSocketState {
		return this.state;
	}

	isConnected(): boolean {
		return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
	}

	async connect(): Promise<void> {
		if (this.state === 'connected' || this.state === 'connecting') {
			return;
		}
		this.shouldReconnect = true;
		await this.establishConnection();
	}

	disconnect(): void {
		this.shouldReconnect = false;
		this.cleanup();
		this.state = 'disconnected';
		this.emit('disconnected', { reconnecting: false });
	}

	private async establishConnection(): Promise<void> {
		this.state = 'connecting';
		this.connectionAttempts++;

		try {
			const accessToken = await this.oauth.getAccessToken();
			this.ws = new WebSocket(DAIKIN_WEBSOCKET_URL, {
				headers: { Authorization: `Bearer ${accessToken}` },
				handshakeTimeout: CONNECTION_TIMEOUT,
			});
			this.setupEventHandlers();
		} catch (error) {
			this.handleError(error as Error);
			this.scheduleReconnect();
		}
	}

	private setupEventHandlers(): void {
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

		this.ws.on('message', (data: WebSocket.Data) => {
			this.handleMessage(data);
		});

		this.ws.on('close', (code: number, reason: Buffer) => {
			this.handleClose(code, reason.toString());
		});

		this.ws.on('error', (error: Error) => {
			this.handleError(error);
		});

		this.ws.on('pong', () => {
			this.clearPongTimeout();
		});
	}

	private handleMessage(data: WebSocket.Data): void {
		try {
			const message = JSON.parse(data.toString());
			if (message.message === 'Internal server error') {
				return;
			}
			if (message.event === 'gateway:managementpoint:characteristic') {
				const event = message as GatewayCharacteristicEvent;
				this.emit('device_update', {
					deviceId: event.gatewayDeviceId,
					embeddedId: event.embeddedId,
					managementPointId: event.managementPointId,
					characteristicName: event.data.name,
					data: event.data,
				} satisfies WebSocketDeviceUpdate);
			}
		} catch {
			// ignore non-JSON
		}
	}

	private handleClose(code: number, reason: string): void {
		this.cleanup();
		if (this.shouldReconnect) {
			this.state = 'reconnecting';
			this.emit('disconnected', { code, reason, reconnecting: true });
			this.scheduleReconnect();
		} else {
			this.state = 'disconnected';
			this.emit('disconnected', { code, reason, reconnecting: false });
		}
	}

	private handleError(error: Error): void {
		this.onError?.(error);
		this.emit('error', error);
	}

	private scheduleReconnect(): void {
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
			} catch (error) {
				this.handleError(error as Error);
				this.scheduleReconnect();
			}
		}, this.reconnectDelay);

		this.reconnectDelay = Math.min(this.reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER, MAX_RECONNECT_DELAY);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.pingInterval = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.ping();
				this.setPongTimeout();
			}
		}, PING_INTERVAL);
	}

	private stopHeartbeat(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		this.clearPongTimeout();
	}

	private setPongTimeout(): void {
		this.clearPongTimeout();
		this.pongTimeout = setTimeout(() => {
			this.ws?.terminate();
		}, PONG_TIMEOUT);
	}

	private clearPongTimeout(): void {
		if (this.pongTimeout) {
			clearTimeout(this.pongTimeout);
			this.pongTimeout = null;
		}
	}

	private cleanup(): void {
		this.stopHeartbeat();
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		if (this.ws) {
			this.ws.removeAllListeners();
			if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close();
			}
			this.ws = null;
		}
	}
}
