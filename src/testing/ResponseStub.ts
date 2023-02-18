export default class ResponseStub implements Response {

    private rawBody: string;

    public readonly body!: ReadableStream<Uint8Array> | null;
    public readonly bodyUsed!: boolean;
    public readonly headers: Headers;
    public readonly ok!: boolean;
    public readonly redirected!: boolean;
    public readonly status: number;
    public readonly statusText!: string;
    public readonly trailer!: Promise<Headers>;
    public readonly type!: ResponseType;
    public readonly url!: string;

    public constructor(rawBody: string = '', headers: Record<string, string> = {}, status: number = 200) {
        this.rawBody = rawBody;
        this.headers = new Headers(headers);
        this.status = status;
    }

    public async arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error('ResponseStub.arrayBuffer is not implemented');
    }

    public async blob(): Promise<Blob> {
        throw new Error('ResponseStub.blob is not implemented');
    }

    public async formData(): Promise<FormData> {
        throw new Error('ResponseStub.formData is not implemented');
    }

    public async json(): Promise<unknown> {
        return JSON.parse(this.rawBody);
    }

    public async text(): Promise<string> {
        return this.rawBody;
    }

    public clone(): Response {
        return { ...this };
    }

}
