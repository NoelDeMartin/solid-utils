import SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';
import NetworkRequestError from '@noeldemartin/solid-utils/errors/NetworkRequestError';
import NotFoundError from '@noeldemartin/solid-utils/errors/NotFoundError';
import UnauthorizedError from '@noeldemartin/solid-utils/errors/UnauthorizedError';
import { turtleToQuads } from '@noeldemartin/solid-utils/helpers/rdf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<Response>;
export declare type TypedFetch = (input: RequestInfo, options?: RequestInit) => Promise<Response>;
export declare type Fetch = TypedFetch | AnyFetch;

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

        if (response.status === 404) throw new NotFoundError(url);

        if ([401, 403].includes(response.status)) throw new UnauthorizedError(url, response.status);

        const body = await response.text();

        return {
            body,
            headers: response.headers,
        };
    } catch (error) {
        if (error instanceof UnauthorizedError) throw error;

        if (error instanceof NotFoundError) throw error;

        throw new NetworkRequestError(url, { cause: error });
    }
}

export interface FetchSolidDocumentOptions {
    fetch?: Fetch;
    cache?: RequestCache;
}

export async function createSolidDocument(url: string, body: string, fetch?: Fetch): Promise<SolidDocument> {
    fetch = fetch ?? window.fetch.bind(window);

    const statements = await turtleToQuads(body);

    await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body,
    });

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
        if (!(error instanceof NotFoundError)) throw error;

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

export async function updateSolidDocument(url: string, body: string, fetch?: Fetch): Promise<void> {
    fetch = fetch ?? window.fetch.bind(window);

    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body,
    });
}
