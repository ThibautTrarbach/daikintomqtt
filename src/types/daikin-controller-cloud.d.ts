declare module "daikin-controller-cloud" {
	const DaikinCloudController: (tokenSet: object|string|undefined, options: { proxyPort: number; proxyListenBind: string; proxyDataDir: string; logLevel: string; logger: winston.Logger; communicationTimeout: number; communicationRetries: number; proxyOwnIp: string; proxyWebPort: number }) => any

	export = DaikinCloudController
}
