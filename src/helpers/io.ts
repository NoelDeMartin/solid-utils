import md5 from 'md5';
import { arr, arrayFilter, arrayReplace, objectWithoutEmpty, stringMatchAll, tap } from '@noeldemartin/utils';
import { BlankNode as N3BlankNode, Quad as N3Quad, Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
import { fromRDF, toRDF } from 'jsonld';
import type { JsonLdDocument } from 'jsonld';
import type { Quad } from 'rdf-js';
import type { Term as N3Term } from 'n3';

import SolidDocument from '@/models/SolidDocument';

import MalformedSolidDocumentError, { SolidDocumentFormat } from '@/errors/MalformedSolidDocumentError';
import NetworkRequestError from '@/errors/NetworkRequestError';
import NotFoundError from '@/errors/NotFoundError';
import UnauthorizedError from '@/errors/UnauthorizedError';
import { isJsonLDGraph } from '@/helpers/jsonld';
import type { JsonLD, JsonLDGraph, JsonLDResource } from '@/helpers/jsonld';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<Response>;
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

        if (error instanceof NotFoundError)
            throw error;

        throw new NetworkRequestError(url, { cause: error });
    }
}

function normalizeBlankNodes(quads: Quad[]): Quad[] {
    const normalizedQuads = quads.slice(0);
    const quadsIndexes: Record<string, Set<number>> = {};
    const blankNodeIds = arr(quads)
        .flatMap(
            (quad, index) => tap(
                arrayFilter([
                    quad.object.termType === 'BlankNode' ? quad.object.value : null,
                    quad.subject.termType === 'BlankNode' ? quad.subject.value : null,
                ]),
                ids => ids.forEach(id => (quadsIndexes[id] ??= new Set()).add(index)),
            ),
        )
        .filter()
        .unique();

    for (const originalId of blankNodeIds) {
        const quadIndexes = quadsIndexes[originalId] as Set<number>;
        const normalizedId = md5(
            arr(quadIndexes)
                .map(index => quads[index] as Quad)
                .filter(({ subject: { termType, value } }) => termType === 'BlankNode' && value === originalId)
                .map(
                    ({ predicate, object }) => object.termType === 'BlankNode'
                        ? predicate.value
                        : predicate.value + object.value,
                )
                .sorted()
                .join(),
        );

        for (const index of quadIndexes) {
            const quad = normalizedQuads[index] as Quad;
            const terms: Record<string, N3Term> = {
                subject: quad.subject as N3Term,
                object: quad.object as N3Term,
            };

            for (const [termName, termValue] of Object.entries(terms)) {
                if (termValue.termType !== 'BlankNode' || termValue.value !== originalId)
                    continue;

                terms[termName] = new N3BlankNode(normalizedId);
            }

            arrayReplace(
                normalizedQuads,
                quad,
                new N3Quad(
                    terms.subject as N3Term,
                    quad.predicate as N3Term,
                    terms.object as N3Term,
                ),
            );
        }
    }

    return normalizedQuads;
}

export interface ParsingOptions {
    baseIRI: string;
    normalizeBlankNodes: boolean;
}

export interface RDFGraphData {
    quads: Quad[];
    containsRelativeIRIs: boolean;
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

export async function fetchSolidDocument(url: string, fetch?: Fetch): Promise<SolidDocument> {
    const { body: data, headers } = await fetchRawSolidDocument(url, fetch ?? window.fetch);
    const statements = await turtleToQuads(data, { baseIRI: url });

    return new SolidDocument(url, statements, headers);
}

export async function fetchSolidDocumentIfFound(url: string, fetch?: Fetch): Promise<SolidDocument | null> {
    try {
        const document = await fetchSolidDocument(url, fetch);

        return document;
    } catch (error) {
        if (!(error instanceof NotFoundError))
            throw error;

        return null;
    }
}

export async function jsonldToQuads(jsonld: JsonLD, baseIRI?: string): Promise<Quad[]> {
    if (isJsonLDGraph(jsonld)) {
        const graphQuads = await Promise.all(jsonld['@graph'].map(resource => jsonldToQuads(resource, baseIRI)));

        return graphQuads.flat();
    }

    return toRDF(jsonld as JsonLdDocument, { base: baseIRI }) as Promise<Quad[]>;
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

export function parseTurtle(turtle: string, options: Partial<ParsingOptions> = {}): Promise<RDFGraphData> {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.baseIRI });
    const parser = new TurtleParser(parserOptions);
    const data: RDFGraphData = {
        quads: [],
        containsRelativeIRIs: false,
    };

    return new Promise((resolve, reject) => {
        const resolveRelativeIRI = parser._resolveRelativeIRI;

        parser._resolveRelativeIRI = (...args) => {
            data.containsRelativeIRIs = true;
            parser._resolveRelativeIRI = resolveRelativeIRI;

            return parser._resolveRelativeIRI(...args);
        };

        parser.parse(turtle, (error, quad) => {
            if (error) {
                reject(
                    new MalformedSolidDocumentError(
                        options.baseIRI ?? null,
                        SolidDocumentFormat.Turtle,
                        error.message,
                    ),
                );

                return;
            }

            if (!quad) {
                data.quads = options.normalizeBlankNodes
                    ? normalizeBlankNodes(data.quads)
                    : data.quads;

                resolve(data);

                return;
            }

            data.quads.push(quad);
        });
    });
}

export async function quadsToJsonLD(quads: Quad[]): Promise<JsonLDGraph> {
    const graph = await fromRDF(quads);

    return {
        '@graph': graph as JsonLDResource[],
    };
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
    const operations = stringMatchAll<3>(sparql, /(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    await Promise.all([...operations].map(async operation => {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = await turtleToQuads(operationBody, options);
    }));

    return quads;
}

export function sparqlToQuadsSync(sparql: string, options: Partial<ParsingOptions> = {}): Record<string, Quad[]> {
    const operations = stringMatchAll<3>(sparql, /(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    for (const operation of operations) {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = turtleToQuadsSync(operationBody, options);
    }

    return quads;
}

export async function turtleToQuads(turtle: string, options: Partial<ParsingOptions> = {}): Promise<Quad[]> {
    const { quads } = await parseTurtle(turtle, options);

    return quads;
}

export function turtleToQuadsSync(turtle: string, options: Partial<ParsingOptions> = {}): Quad[] {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.baseIRI });
    const parser = new TurtleParser(parserOptions);

    try {
        const quads = parser.parse(turtle);

        return options.normalizeBlankNodes
            ? normalizeBlankNodes(quads)
            : quads;
    } catch (error) {
        throw new MalformedSolidDocumentError(
            options.baseIRI ?? null,
            SolidDocumentFormat.Turtle,
            (error as Error).message ?? '',
        );
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
