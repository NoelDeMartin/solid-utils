import type { Quad } from '@rdfjs/types';

import {
    createSolidContainer,
    createSolidDocument,
    deleteSolidDocument,
    fetchSolidDocument,
    fetchSolidDocumentIfFound,
    solidDocumentExists,
    updateSolidDocument,
} from '@noeldemartin/solid-utils/helpers/io';
import type SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import type {
    CreateSolidDocumentOptions,
    Fetch,
    FetchSolidDocumentOptions,
} from '@noeldemartin/solid-utils/helpers/io';
import type { SolidDocument } from '@noeldemartin/solid-utils/models';

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

    public exists(url: string): Promise<boolean> {
        return solidDocumentExists(url, this.options);
    }

    public read(url: string): Promise<SolidDocument> {
        return fetchSolidDocument(url, this.options);
    }

    public readIfFound(url: string): Promise<SolidDocument | null> {
        return fetchSolidDocumentIfFound(url, this.options);
    }

    public update(
        url: string,
        update: SparqlUpdate,
        options?: Omit<FetchSolidDocumentOptions, keyof SolidClientOptions>,
    ): Promise<void> {
        return updateSolidDocument(url, update, { ...this.options, ...options });
    }

    public delete(url: string): Promise<void> {
        return deleteSolidDocument(url, this.options);
    }

}
