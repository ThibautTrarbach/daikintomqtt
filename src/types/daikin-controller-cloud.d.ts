declare module "daikin-controller-cloud" {
	const DaikinCloudController: (tokenSet: object, options: { proxyPort: number; proxyListenBind: string; proxyDataDir: string; logLevel: string; logger: winston.Logger; communicationTimeout: number; communicationRetries: number; proxyOwnIp: string; proxyWebPort: number }) => void

	export = DaikinCloudController
}
