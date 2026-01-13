import {
    createSolidDocument,
    fetchSolidDocument,
    fetchSolidDocumentIfFound,
    solidDocumentExists,
    updateSolidDocument,
} from '@noeldemartin/solid-utils/helpers/io';
import type { SolidDocument } from '@noeldemartin/solid-utils/models';
import type { Fetch, FetchSolidDocumentOptions } from '@noeldemartin/solid-utils/helpers/io';

export default class SolidClient {

    private options: FetchSolidDocumentOptions;

    constructor(fetch: Fetch) {
        this.options = { fetch };
    }

    public create(url: string, body: string): Promise<SolidDocument> {
        return createSolidDocument(url, body, this.options);
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

    public update(url: string, body: string): Promise<void> {
        return updateSolidDocument(url, body, this.options);
    }

}
