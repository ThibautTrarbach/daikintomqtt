// Vendored from daikin-controller-cloud v2.4.3 (fork ThibautTrarbach, based on Apollon77/daikin-controller-cloud)
// Extended with mp-consulting patterns: Mobile App auth, WebSocket push

import { EventEmitter } from 'events';
import { DaikinCloudDevice } from './device';
import { OnectaClient } from './onecta/oidc-client';
import { DaikinMobileOAuth } from './onecta/mobile-oauth';
import { DaikinWebSocket } from './onecta/websocket';
import { OnectaClientConfig, OnectaRateLimitStatus, OnectaMockDevice } from './onecta/oidc-utils';
import { TokenSet } from "openid-client";
import type { AuthMode, WebSocketDeviceUpdate } from './types';
import { AUTH_MODE_DEVELOPER_PORTAL, AUTH_MODE_MOBILE_APP } from './constants';
import { configureHttpTransport } from './http-transport';
import type { HttpTransportMode } from './http-transport';

export { DaikinCloudDevice } from './device';
export { OnectaClientConfig, OnectaRateLimitStatus, TokenSet, OnectaMockDevice };
export type { AuthMode, WebSocketDeviceUpdate };
export { AUTH_MODE_DEVELOPER_PORTAL, AUTH_MODE_MOBILE_APP };

export interface DaikinControllerConfig extends OnectaClientConfig {
    authMode?: AuthMode;
    mobileEmail?: string;
    mobilePassword?: string;
    mobileTokenFilePath?: string;
    enableWebSocket?: boolean;
    httpTransport?: HttpTransportMode;
}

interface DaikinCloudControllerEvents {
    "error": [err: Error];
    "authorization_request": [url: string];
    "token_update": [tokenSet: TokenSet];
    "rate_limit_status": [OnectaRateLimitStatus];
    "websocket_connected": [];
    "websocket_disconnected": [info?: { reconnecting?: boolean; code?: number; reason?: string }];
    "websocket_device_update": [update: WebSocketDeviceUpdate];
}

export class RateLimitedError extends Error {
    constructor(message: string, public retryAfter?: number) {
        super(message);
    }
}

export class DaikinCloudController extends EventEmitter<DaikinCloudControllerEvents> {
    #client: OnectaClient;
    #devices = new Map<string, DaikinCloudDevice>();
    #authMode: AuthMode;
    #mobileOAuth: DaikinMobileOAuth | null = null;
    #websocket: DaikinWebSocket | null = null;

    constructor(config: DaikinControllerConfig) {
        super();
        this.#authMode = config.authMode ?? AUTH_MODE_DEVELOPER_PORTAL;
        configureHttpTransport(config.httpTransport);

        if (this.#authMode === AUTH_MODE_MOBILE_APP) {
            if (!config.mobileEmail || !config.mobilePassword || !config.mobileTokenFilePath) {
                throw new Error('Mobile App auth requires mobileEmail, mobilePassword and mobileTokenFilePath');
            }
            this.#mobileOAuth = new DaikinMobileOAuth(
                {
                    email: config.mobileEmail,
                    password: config.mobilePassword,
                    tokenFilePath: config.mobileTokenFilePath,
                },
                (tokenSet) => this.emit('token_update', tokenSet as TokenSet),
                (error) => this.emit('error', error),
                (message) => this.emit('log' as any, message),
            );
        }

        this.#client = new OnectaClient(config, this, this.#mobileOAuth);
    }

    getAuthMode(): AuthMode {
        return this.#authMode;
    }

    isAuthenticated(): boolean {
        if (this.#authMode === AUTH_MODE_MOBILE_APP) {
            return this.#mobileOAuth?.isAuthenticated() ?? false;
        }
        return true;
    }

    async authenticateMobile(): Promise<void> {
        if (!this.#mobileOAuth) {
            throw new Error('Mobile OAuth is not configured');
        }
        await this.#mobileOAuth.authenticate();
    }

    isWebSocketConnected(): boolean {
        return this.#websocket?.isConnected() ?? false;
    }

    async enableWebSocket(): Promise<void> {
        if (this.#authMode !== AUTH_MODE_MOBILE_APP || !this.#mobileOAuth) {
            return;
        }
        if (this.#websocket) {
            await this.#websocket.connect();
            return;
        }
        this.#websocket = new DaikinWebSocket(
            this.#mobileOAuth,
            (error) => this.emit('error', error),
        );
        this.#websocket.on('connected', () => this.emit('websocket_connected'));
        this.#websocket.on('disconnected', (info) => this.emit('websocket_disconnected', info));
        this.#websocket.on('device_update', (update) => this.emit('websocket_device_update', update));
        await this.#websocket.connect();
    }

    disableWebSocket(): void {
        this.#websocket?.disconnect();
    }

    async getApiInfo() {
        return this.#client.requestResource('/v1/info');
    }

    async requestResource(path: string, opts?: Parameters<OnectaClient['requestResource']>[1]) {
        return this.#client.requestResource(path, opts);
    }

    async getCloudDeviceDetails(): Promise<any[]> {
        return await this.#client.requestResource('/v1/gateway-devices');
    }

    async getCloudDevices(): Promise<DaikinCloudDevice[]> {
        await this.updateAllDeviceData();
        return Array.from(this.#devices.values());
    }

    getDeviceById(deviceId: string): DaikinCloudDevice | undefined {
        return this.#devices.get(deviceId);
    }

    async updateAllDeviceData() {
        const data = await this.getCloudDeviceDetails();
        if (!Array.isArray(data)) {
            throw new Error('Invalid data received from cloud');
        }
        data.forEach(d => {
            const device = this.#devices.get(d.id);
            if (device) {
                device.setDescription(d);
            } else {
                const newDevice = new DaikinCloudDevice(d, this.#client);
                this.#devices.set(newDevice.getId(), newDevice);
            }
        });
    }
}
