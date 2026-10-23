export type HttpTransportMode = 'node' | 'curl';
declare function configureHttpTransport(mode?: HttpTransportMode): void;
declare function getHttpTransportMode(): HttpTransportMode;
interface HttpResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
}
declare function httpRequest(url: string, options: {
    method: string;
    headers?: Record<string, string>;
}, postData?: string): Promise<HttpResponse>;
export { configureHttpTransport, getHttpTransportMode, httpRequest, };
