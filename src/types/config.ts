export interface Config {
    system: ConfigSystem
    daikin: ConfigDaikin
    mqtt: ConfigMQTT
}

export interface ConfigSystem {
    logLevel: string
}

export interface ConfigDaikin {
    modeProxy: boolean
    username: string | null | undefined
    password: string | null | undefined
    proxyPort: number
    proxyWebPort: number
    communicationTimeout: number
    communicationRetries: number
}

export interface ConfigMQTT {
    host: string
    port: number
    auth: boolean
    username: string | null | undefined
    password: string | null | undefined
    connectTimeout: number
    reconnectPeriod: number
    topic: string
}