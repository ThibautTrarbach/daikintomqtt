import type { WebSocketDeviceUpdate } from '../daikin-cloud';
declare function recordWebSocketConfirmation(deviceId: string): Promise<void>;
declare function wasConfirmedByWebSocket(deviceId: string | undefined, actionTs: number): Promise<boolean>;
declare function handleWebSocketDeviceUpdate(update: WebSocketDeviceUpdate): Promise<void>;
export { handleWebSocketDeviceUpdate, wasConfirmedByWebSocket, recordWebSocketConfirmation, };
