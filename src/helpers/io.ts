import { isInstanceOf } from '@noeldemartin/utils';

import SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';
import NetworkRequestFailed from '@noeldemartin/solid-utils/errors/NetworkRequestFailed';
import NotFound from '@noeldemartin/solid-utils/errors/NotFound';
import Unauthorized from '@noeldemartin/solid-utils/errors/Unauthorized';
import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { quadsToTurtle, turtleToQuads } from '@noeldemartin/solid-utils/helpers/rdf';
import type SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<Response>;
export declare type TypedFetch = (input: RequestInfo, options?: RequestInit) => Promise<Response>;
export declare type Fetch = TypedFetch | AnyFetch;

function assertSuccessfulResponse(response: Response, errorMessage: string): void {
    if (Math.floor(response.status / 100) === 2) {
        return;
    }

    throw new UnsuccessfulNetworkRequest(errorMessage, response);
}

async function fetchRawSolidDocument(
    url: string,
    options?: FetchSolidDocumentOptions,
): Promise<{ body: string; headers: Headers }> {
    const requestOptions: RequestInit = {
        headers: { Accept: 'text/turtle' },
    };

    if (options?.cache) {
        requestOptions.cache = options.cache;
    }

    try {
        const fetch = options?.fetch ?? window.fetch;
        const response = await fetch(url, requestOptions);

        if (response.status === 404) {
            throw new NotFound(url);
        }

        if ([401, 403].includes(response.status)) {
            throw new Unauthorized(url, response.status);
        }

        assertSuccessfulResponse(response, `Error fetching document at ${url}`);

        const body = await response.text();

        return {
            body,
            headers: response.headers,
        };
    } catch (error) {
        if (error instanceof Unauthorized) throw error;

        if (error instanceof NotFound) throw error;

        throw new NetworkRequestFailed(url, { cause: error });
    }
}

export interface FetchSolidDocumentOptions {
    fetch?: Fetch;
    cache?: RequestCache;
}

export async function createSolidDocument(
    url: string,
    body: string,
    options?: FetchSolidDocumentOptions,
): Promise<SolidDocument> {
    const fetch = options?.fetch ?? window.fetch.bind(window);

    const statements = await turtleToQuads(body);
    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body,
    });

    assertSuccessfulResponse(response, `Error creating document at ${url}`);

    return new SolidDocument(url, statements, new Headers({}));
}

export async function fetchSolidDocument(url: string, options?: FetchSolidDocumentOptions): Promise<SolidDocument> {
    const { body: data, headers } = await fetchRawSolidDocument(url, options);
    const statements = await turtleToQuads(data, { baseIRI: url });

    return new SolidDocument(url, statements, headers);
}

export async function fetchSolidDocumentIfFound(
    url: string,
    options?: FetchSolidDocumentOptions,
): Promise<SolidDocument | null> {
    try {
        const document = await fetchSolidDocument(url, options);

        return document;
    } catch (error) {
        if (!isInstanceOf(error, NotFound)) {
            throw error;
        }

        return null;
    }
}

export async function solidDocumentExists(url: string, options?: FetchSolidDocumentOptions): Promise<boolean> {
    try {
        const document = await fetchSolidDocument(url, options);

        return !document.isEmpty();
    } catch (error) {
        return false;
    }
}

export async function updateSolidDocument(
    url: string,
    update: SparqlUpdate,
    options?: FetchSolidDocumentOptions,
): Promise<void> {
    const fetch = options?.fetch ?? window.fetch.bind(window);

    if (update.inserts.length === 0 && update.deletes.length === 0) {
        return;
    }

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: `
            DELETE DATA { ${quadsToTurtle(update.deletes)} } ;
            INSERT DATA { ${quadsToTurtle(update.inserts)} }
        `,
    });

    assertSuccessfulResponse(response, `Error updating document at ${url}`);
}

export async function deleteSolidDocument(url: string, options?: FetchSolidDocumentOptions): Promise<void> {
    const fetch = options?.fetch ?? window.fetch.bind(window);
    const response = await fetch(url, { method: 'DELETE' });

    assertSuccessfulResponse(response, `Error deleting document at ${url}`);
}
