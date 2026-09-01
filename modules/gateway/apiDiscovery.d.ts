import { DaikinCloudDevice } from '../../daikin-cloud';
export interface ApiDatapointRef {
    managementPoint: string;
    dataPoint: string;
    dataPointPath?: string;
    settable: boolean;
}
export declare const SKIP_DATAPOINTS: Set<string>;
export declare function normalizeDatapointPath(dataPointPath?: string): string | undefined;
export declare function makeDatapointKey(managementPoint: string, dataPoint: string, dataPointPath?: string): string;
export declare function discoverApiDatapoints(device: DaikinCloudDevice, exposeReadOnly?: boolean): ApiDatapointRef[];
