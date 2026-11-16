import {
    createSolidContainer,
    createSolidDocument,
    createSolidDocumentInContainer,
    deleteSolidDocument,
    fetchSolidDocument,
    fetchSolidDocumentIfFound,
    fetchSolidFile,
    solidDocumentExists,
    updateSolidDocument,
    uploadSolidFile,
    uploadSolidFileInContainer,
} from '@noeldemartin/solid-utils/helpers/io';
import type {
    CreateSolidDocumentInContainerOptions,
    CreateSolidDocumentOptions,
    Fetch,
    FetchSolidDocumentOptions,
    FetchSolidResourceOptions,
    SolidFileResponse,
    SolidResponse,
    UploadSolidFileInContainerOptions,
    UploadSolidFileOptions,
} from '@noeldemartin/solid-utils/helpers/io';
import type { SolidDocument } from '@noeldemartin/solid-utils/models';
import type SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import type { Quad } from '@rdfjs/types';

export type SolidClientOptions = Pick<FetchSolidDocumentOptions, 'fetch' | 'cache' | 'headers'>;

export default class SolidClient {
    constructor(private options: SolidClientOptions = {}) {}

    public getFetch(): Fetch | null {
        return this.options.fetch ?? null;
    }

    public create(
        url: string,
        body: string | Quad[],
        options?: Omit<CreateSolidDocumentOptions, keyof SolidClientOptions>,
    ): Promise<SolidDocument> {
        const computedOptions = { ...options, ...this.options };

        return url.endsWith('/')
            ? createSolidContainer(url, body, computedOptions)
            : createSolidDocument(url, body, computedOptions);
    }

    public createInContainer(
        containerUrl: string,
        body: string | Quad[],
        options?: Omit<CreateSolidDocumentInContainerOptions, keyof SolidClientOptions>,
    ): Promise<SolidDocument> {
        return createSolidDocumentInContainer(containerUrl, body, { ...options, ...this.options });
    }

    public exists(url: string): Promise<boolean> {
        return solidDocumentExists(url, this.options);
    }

    public read(url: string, options?: Pick<FetchSolidDocumentOptions, 'cache' | 'headers'>): Promise<SolidDocument> {
        const headers = {
            ...this.options.headers,
            ...options?.headers,
        };

        return fetchSolidDocument(url, {
            ...this.options,
            ...options,
            headers,
        });
    }

    public readIfFound(
        url: string,
        options?: Pick<FetchSolidDocumentOptions, 'cache' | 'headers'>,
    ): Promise<SolidDocument | null> {
        const headers = {
            ...this.options.headers,
            ...options?.headers,
        };

        return fetchSolidDocumentIfFound(url, {
            ...this.options,
            ...options,
            headers,
        });
    }

    public update(
        url: string,
        update: SparqlUpdate,
        options?: Omit<FetchSolidDocumentOptions, keyof SolidClientOptions>,
    ): Promise<SolidResponse | null> {
        return updateSolidDocument(url, update, { ...this.options, ...options });
    }

    public delete(url: string): Promise<SolidResponse> {
        return deleteSolidDocument(url, this.options);
    }

    public uploadFile(
        url: string,
        file: Blob,
        options?: Omit<UploadSolidFileOptions, keyof SolidClientOptions>,
    ): Promise<SolidResponse> {
        return uploadSolidFile(url, file, { ...this.options, ...options });
    }

    public uploadFileInContainer(
        containerUrl: string,
        file: Blob,
        options?: Omit<UploadSolidFileInContainerOptions, keyof SolidClientOptions>,
    ): Promise<SolidFileResponse> {
        return uploadSolidFileInContainer(containerUrl, file, { ...this.options, ...options });
    }

    public readFile(url: string, options?: Pick<FetchSolidResourceOptions, 'cache' | 'headers'>): Promise<Blob> {
        const headers = {
            ...this.options.headers,
            ...options?.headers,
        };

        return fetchSolidFile(url, {
            ...this.options,
            ...options,
            headers,
        });
    }
}
