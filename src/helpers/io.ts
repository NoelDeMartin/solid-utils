import NetworkRequestFailed from '@noeldemartin/solid-utils/errors/NetworkRequestFailed';
import NotFound from '@noeldemartin/solid-utils/errors/NotFound';
import Unauthorized from '@noeldemartin/solid-utils/errors/Unauthorized';
import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { quadsToTurtle, turtleToQuads } from '@noeldemartin/solid-utils/helpers/rdf';
import SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';
import SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import { arrayFilter, escapeRegexText, isInstanceOf } from '@noeldemartin/utils';
import type { Quad } from '@rdfjs/types';

// oxlint-disable-next-line typescript/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<Response>;
export declare type TypedFetch = (input: RequestInfo, options?: RequestInit) => Promise<Response>;
export declare type Fetch = TypedFetch | AnyFetch;

export const globalFetch: TypedFetch = (input, options) => globalThis.fetch(input, options);

function relativeTurtle(base: string, turtle: string): string {
    return turtle.replace(new RegExp(`<${escapeRegexText(base)}(#|>)`, 'g'), '<$1');
}

function assertSuccessfulResponse(response: Response, errorMessage: string): void {
    if (Math.floor(response.status / 100) === 2) {
        return;
    }

    throw new UnsuccessfulNetworkRequest(errorMessage, response);
}

async function fetchSolidResource(
    url: string,
    options?: FetchSolidResourceOptions,
    accept?: string,
): Promise<Response> {
    const requestOptions: RequestInit = {
        headers: accept
            ? {
                  ...options?.headers,
                  Accept: accept,
              }
            : options?.headers,
    };

    if (options?.cache) {
        requestOptions.cache = options.cache;
    }

    try {
        const fetch = options?.fetch ?? globalFetch;
        const response = await fetch(url, requestOptions);

        if (response.status === 404) {
            throw new NotFound(url);
        }

        if ([401, 403].includes(response.status)) {
            throw new Unauthorized(url, response.status);
        }

        assertSuccessfulResponse(response, `Error fetching resource at ${url}`);

        return response;
    } catch (error) {
        if (error instanceof Unauthorized || error instanceof NotFound) {
            throw error;
        }

        throw new NetworkRequestFailed(url, { cause: error });
    }
}

async function fetchRawSolidDocument(
    url: string,
    options?: FetchSolidDocumentOptions,
): Promise<{ body: string; headers: Headers }> {
    const response = await fetchSolidResource(url, options, 'text/turtle');
    const body = await response.text();

    return {
        body,
        headers: response.headers,
    };
}

function removeDuplicates(update: SparqlUpdate): void {
    let deleteIndex = 0;

    while (deleteIndex < update.deletes.length) {
        const deleteQuad = update.deletes[deleteIndex];
        const insertIndex = update.inserts.findIndex((insertQuad) => insertQuad.equals(deleteQuad));

        if (insertIndex !== -1) {
            update.inserts.splice(insertIndex, 1);
            update.deletes.splice(deleteIndex, 1);

            continue;
        }

        deleteIndex++;
    }
}

export interface FetchOptions {
    fetch?: Fetch;
}

export interface FetchSolidResourceOptions extends FetchOptions {
    cache?: RequestCache;
    headers?: Record<string, string>;
}

export interface FetchSolidDocumentOptions extends FetchSolidResourceOptions {
    base?: string;
}

export interface CreateSolidDocumentOptions extends FetchSolidDocumentOptions {
    method?: 'PATCH' | 'PUT';
}

export interface CreateSolidDocumentInContainerOptions extends FetchSolidDocumentOptions {
    slug?: string;
}

export interface SolidResponse {
    headers: Headers;
}

export interface SolidFileResponse extends SolidResponse {
    url: string;
}

export interface UploadSolidFileOptions extends FetchOptions {
    headers?: Record<string, string>;
    contentType?: string;
    overwrite?: boolean;
}

export interface UploadSolidFileInContainerOptions extends FetchOptions {
    headers?: Record<string, string>;
    contentType?: string;
    slug?: string;
}

export async function createSolidContainer(
    url: string,
    body: string | Quad[],
    options?: CreateSolidDocumentOptions,
): Promise<SolidDocument> {
    const document = await createSolidDocument(url, '', {
        ...options,
        headers: {
            ...options?.headers,
            'Content-Type': 'text/turtle',
            Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        },
    });

    const quads = typeof body === 'string' ? await turtleToQuads(body) : body;

    document.addQuads(quads);

    // oxlint-disable-next-line no-unused-vars
    const { method, ...updateOptions } = options ?? {};

    await updateSolidDocument(document.getDescriptionUrl(), new SparqlUpdate().insert(quads), {
        ...updateOptions,
        base: url,
    });

    return document;
}

export async function createSolidDocument(
    url: string,
    body?: string | Quad[],
    options?: CreateSolidDocumentOptions,
): Promise<SolidDocument> {
    const fetch = options?.fetch ?? globalFetch;
    const quads: Quad[] = [];
    const request: { method: string; headers: Record<string, string>; body?: string } = {
        method: options?.method ?? 'PUT',
        headers: {
            ...options?.headers,
            'If-None-Match': '*',
        },
    };

    if (body) {
        quads.push(...(typeof body === 'string' ? await turtleToQuads(body) : body));

        const turtle = relativeTurtle(options?.base ?? url, typeof body === 'string' ? body : quadsToTurtle(quads));
        request.body = request.method === 'PUT' ? turtle : `INSERT DATA { ${turtle} }`;
        request.headers['Content-Type'] = request.method === 'PUT' ? 'text/turtle' : 'application/sparql-update';
    }

    const response = await fetch(url, request);

    assertSuccessfulResponse(response, `Error creating document at ${url}`);

    return new SolidDocument(url, quads, response.headers);
}

export async function createSolidDocumentInContainer(
    containerUrl: string,
    body: string | Quad[],
    options?: CreateSolidDocumentInContainerOptions,
): Promise<SolidDocument> {
    const fetch = options?.fetch ?? globalFetch;
    const turtle = typeof body === 'string' ? body : quadsToTurtle(body);
    const relativeBody = options?.base ? relativeTurtle(options.base, turtle) : turtle;
    const headers: Record<string, string> = { ...options?.headers, 'Content-Type': 'text/turtle' };

    if (options?.slug) {
        headers.Slug = encodeURIComponent(options.slug);
    }

    const response = await fetch(containerUrl, { method: 'POST', headers, body: relativeBody });

    assertSuccessfulResponse(response, `Error creating document in ${containerUrl}`);

    const location = response.headers.get('Location');

    if (!location) {
        throw new UnsuccessfulNetworkRequest(`Missing location of the document created in ${containerUrl}`, response);
    }

    const documentUrl = new URL(location, containerUrl).href;

    return new SolidDocument(
        documentUrl,
        await turtleToQuads(relativeBody, { baseIRI: documentUrl }),
        response.headers,
    );
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
    } catch {
        return false;
    }
}

export async function updateSolidDocument(
    url: string,
    update: SparqlUpdate,
    options?: FetchSolidDocumentOptions,
): Promise<SolidResponse | null> {
    const fetch = options?.fetch ?? globalFetch;
    const base = options?.base ?? url;

    removeDuplicates(update);

    if (update.inserts.length === 0 && update.deletes.length === 0) {
        return null;
    }

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            ...options?.headers,
            'Content-Type': 'application/sparql-update',
        },
        body: arrayFilter([
            update.deletes.length > 0 && `DELETE DATA { ${relativeTurtle(base, quadsToTurtle(update.deletes))} }`,
            update.inserts.length > 0 && `INSERT DATA { ${relativeTurtle(base, quadsToTurtle(update.inserts))} }`,
        ]).join(' ; '),
    });

    assertSuccessfulResponse(response, `Error updating document at ${url}`);

    return { headers: response.headers };
}

export async function deleteSolidDocument(url: string, options?: FetchSolidDocumentOptions): Promise<SolidResponse> {
    const fetch = options?.fetch ?? globalFetch;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: options?.headers,
    });

    assertSuccessfulResponse(response, `Error deleting document at ${url}`);

    return { headers: response.headers };
}

export async function uploadSolidFile(
    url: string,
    file: Blob,
    options?: UploadSolidFileOptions,
): Promise<SolidResponse> {
    const fetch = options?.fetch ?? globalFetch;
    const headers: Record<string, string> = {
        ...options?.headers,
        'Content-Type': options?.contentType ?? (file.type || 'application/octet-stream'),
    };

    if (options?.overwrite === false) {
        headers['If-None-Match'] = '*';
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: file,
    });

    assertSuccessfulResponse(response, `Error uploading file at ${url}`);

    return { headers: response.headers };
}

export async function uploadSolidFileInContainer(
    containerUrl: string,
    file: Blob,
    options?: UploadSolidFileInContainerOptions,
): Promise<SolidFileResponse> {
    const fetch = options?.fetch ?? globalFetch;
    const headers: Record<string, string> = {
        ...options?.headers,
        'Content-Type': options?.contentType ?? (file.type || 'application/octet-stream'),
    };
    const slug = options?.slug ?? (typeof File !== 'undefined' && file instanceof File ? file.name : undefined);

    if (slug) {
        headers.Slug = encodeURIComponent(slug);
    }

    const response = await fetch(containerUrl, {
        method: 'POST',
        headers,
        body: file,
    });

    assertSuccessfulResponse(response, `Error uploading file in ${containerUrl}`);

    const location = response.headers.get('Location');

    if (!location) {
        throw new UnsuccessfulNetworkRequest(`Missing location of the file uploaded in ${containerUrl}`, response);
    }

    return {
        url: new URL(location, containerUrl).href,
        headers: response.headers,
    };
}

export async function fetchSolidFile(url: string, options?: FetchSolidResourceOptions): Promise<Blob> {
    const response = await fetchSolidResource(url, options);

    return response.blob();
}
