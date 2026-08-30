declare function enqueueWriteForDevice<T>(deviceId: string, fn: () => Promise<T>): Promise<T>;
export { enqueueWriteForDevice, };
