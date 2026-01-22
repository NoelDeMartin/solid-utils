import type { Quad } from '@rdfjs/types';

import {
    createSolidDocument,
    deleteSolidDocument,
    fetchSolidDocument,
    fetchSolidDocumentIfFound,
    solidDocumentExists,
    updateSolidDocument,
} from '@noeldemartin/solid-utils/helpers/io';
import type SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import type { CreateSolidDocumentOptions, FetchSolidDocumentOptions } from '@noeldemartin/solid-utils/helpers/io';
import type { SolidDocument } from '@noeldemartin/solid-utils/models';

export default class SolidClient {

    constructor(private options: FetchSolidDocumentOptions = {}) {}

    public create(
        url: string,
        body: string | Quad[],
        options?: Omit<CreateSolidDocumentOptions, keyof FetchSolidDocumentOptions>,
    ): Promise<SolidDocument> {
        return createSolidDocument(url, body, { ...options, ...this.options });
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

    public update(url: string, update: SparqlUpdate): Promise<void> {
        return updateSolidDocument(url, update, this.options);
    }

    public delete(url: string): Promise<void> {
        return deleteSolidDocument(url, this.options);
    }

}
