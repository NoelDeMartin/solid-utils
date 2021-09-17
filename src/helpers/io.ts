import { arr, arrayFilter, arrayReplace,objectWithoutEmpty } from '@noeldemartin/utils';
import { BlankNode as N3BlankNode, Quad as N3Quad, Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
import type { JsonLdDocument } from 'jsonld';
import { toRDF } from 'jsonld';
import md5 from 'md5';
import type { Quad } from 'rdf-js';
import type { Term as N3Term } from 'n3';

import SolidDocument from '@/models/SolidDocument';

import MalformedSolidDocumentError, { SolidDocumentFormat } from '@/errors/MalformedSolidDocumentError';
import NetworkRequestError from '@/errors/NetworkRequestError';
import NotFoundError from '@/errors/NotFoundError';
import UnauthorizedError from '@/errors/UnauthorizedError';
import { isJsonLDGraph } from '@/helpers/jsonld';
import type { JsonLD } from '@/helpers/jsonld';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<any>;
export declare type TypedFetch = (input: RequestInfo, options?: RequestInit) => Promise<Response>;
export declare type Fetch = TypedFetch | AnyFetch;

async function fetchRawSolidDocument(url: string, fetch: Fetch): Promise<{ body: string; headers: Headers }> {
    const options = {
        headers: { Accept: 'text/turtle' },
    };

    try {
        const response = await fetch(url, options);

        if (response.status === 404)
            throw new NotFoundError(url);

        if ([401, 403].includes(response.status))
            throw new UnauthorizedError(url, response.status);

        const body = await response.text();

        return {
            body,
            headers: response.headers,
        };
    } catch (error) {
        if (error instanceof UnauthorizedError)
            throw error;

        throw new NetworkRequestError(url);
    }
}

function normalizeBlankNodes(quads: Quad[]): Quad[] {
    const normalizedQuads = quads.slice(0);
    const quadsIndexes: Record<string, Set<number>> = {};
    const blankNodeIds = arr(quads)
        .flatMap((quad, index) => {
            const ids = arrayFilter([
                quad.object.termType === 'BlankNode' ? quad.object.value : null,
                quad.subject.termType === 'BlankNode' ? quad.subject.value : null,
            ]);

            for (const id of ids) {
                quadsIndexes[id] = quadsIndexes[id] ?? new Set();
                quadsIndexes[id].add(index);
            }

            return ids;
        })
        .filter()
        .unique();

    for (const originalId of blankNodeIds) {
        const normalizedId = md5(
            arr(quadsIndexes[originalId])
                .map(index => quads[index])
                .filter(({ subject: { termType, value } }) => termType === 'BlankNode' && value === originalId)
                .map(
                    ({ predicate, object }) => object.termType === 'BlankNode'
                        ? predicate.value
                        : predicate.value + object.value,
                )
                .sorted()
                .join(),
        );

        for (const index of quadsIndexes[originalId]) {
            const quad = normalizedQuads[index];
            const terms: Record<string, N3Term> = { subject: quad.subject as N3Term, object: quad.object as N3Term };

            for (const [termName, termValue] of Object.entries(terms)) {
                if (termValue.termType !== 'BlankNode' || termValue.value !== originalId)
                    continue;

                terms[termName] = new N3BlankNode(normalizedId);
            }

            arrayReplace(normalizedQuads, quad, new N3Quad(terms.subject, quad.predicate as N3Term, terms.object));
        }
    }

    return normalizedQuads;
}

export interface ParsingOptions {
    documentUrl: string;
    normalizeBlankNodes: boolean;
}

export async function createSolidDocument(url: string, body: string, fetch?: Fetch): Promise<SolidDocument> {
    fetch = fetch ?? window.fetch;

    const statements = await turtleToQuads(body);

    await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body,
    });

    return new SolidDocument(url, statements, new Headers({}));
}

export async function fetchSolidDocument(url: string, fetch?: Fetch): Promise<SolidDocument> {
    const { body: data, headers } = await fetchRawSolidDocument(url, fetch ?? window.fetch);
    const statements = await turtleToQuads(data, { documentUrl: url });

    return new SolidDocument(url, statements, headers);
}

export async function jsonldToQuads(jsonld: JsonLD): Promise<Quad[]> {
    if (isJsonLDGraph(jsonld)) {
        const graphQuads = await Promise.all(jsonld['@graph'].map(jsonldToQuads));

        return graphQuads.flat();
    }

    return toRDF(jsonld as JsonLdDocument) as Promise<Quad[]>;
}

export function normalizeSparql(sparql: string): string {
    const quads = sparqlToQuadsSync(sparql);

    return Object
        .entries(quads)
        .reduce((normalizedOperations, [operation, quads]) => {
            const normalizedQuads = quads.map(quad => '    ' + quadToTurtle(quad)).sort().join('\n');

            return normalizedOperations.concat(`${operation.toUpperCase()} DATA {\n${normalizedQuads}\n}`);
        }, [] as string[])
        .join(' ;\n');
}

export function quadsToTurtle(quads: Quad[]): string {
    const writer = new TurtleWriter;

    return writer.quadsToString(quads);
}

export function quadToTurtle(quad: Quad): string {
    const writer = new TurtleWriter;

    return writer.quadsToString([quad]).slice(0, -1);
}

export async function solidDocumentExists(url: string, fetch?: Fetch): Promise<boolean> {
    try {
        const document = await fetchSolidDocument(url, fetch);

        return !document.isEmpty();
    } catch (error) {
        return false;
    }
}

export async function sparqlToQuads(
    sparql: string,
    options: Partial<ParsingOptions> = {},
): Promise<Record<string, Quad[]>> {
    const operations = sparql.matchAll(/(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    await Promise.all([...operations].map(async operation => {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = await turtleToQuads(operationBody, options);
    }));

    return quads;
}

export function sparqlToQuadsSync(sparql: string, options: Partial<ParsingOptions> = {}): Record<string, Quad[]> {
    const operations = sparql.matchAll(/(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    for (const operation of operations) {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = turtleToQuadsSync(operationBody, options);
    }

    return quads;
}

export async function turtleToQuads(turtle: string, options: Partial<ParsingOptions> = {}): Promise<Quad[]> {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.documentUrl });
    const parser = new TurtleParser(parserOptions);
    const quads: Quad[] = [];

    return new Promise((resolve, reject) => {
        parser.parse(turtle, (error, quad) => {
            if (error) {
                reject(
                    new MalformedSolidDocumentError(
                        options.documentUrl ?? null,
                        SolidDocumentFormat.Turtle,
                        error.message,
                    ),
                );
                return;
            }

            if (!quad) {
                options.normalizeBlankNodes
                    ? resolve(normalizeBlankNodes(quads))
                    : resolve(quads);

                return;
            }

            quads.push(quad);
        });
    });
}

export function turtleToQuadsSync(turtle: string, options: Partial<ParsingOptions> = {}): Quad[] {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.documentUrl });
    const parser = new TurtleParser(parserOptions);

    try {
        const quads = parser.parse(turtle);

        return options.normalizeBlankNodes
            ? normalizeBlankNodes(quads)
            : quads;
    } catch (error) {
        throw new MalformedSolidDocumentError(options.documentUrl ?? null, SolidDocumentFormat.Turtle, error.message);
    }
}

export async function updateSolidDocument(url: string, body: string, fetch?: Fetch): Promise<void> {
    fetch = fetch ?? window.fetch;

    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body,
    });
}
