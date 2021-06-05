import { objectWithoutEmpty } from '@noeldemartin/utils';
import { Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
import type { Quad } from 'rdf-js';

import SolidDocument from '@/models/SolidDocument';

import UnauthorizedError from '@/errors/UnauthorizedError';
import NetworkRequestError from '@/errors/NetworkRequestError';
import MalformedSolidDocumentError, { SolidDocumentFormat } from '@/errors/MalformedSolidDocumentError';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type AnyFetch = (input: any, options?: any) => Promise<any>;
export declare type TypedFetch = (input: RequestInfo, options?: RequestInit) => Promise<Response>;
export declare type Fetch = TypedFetch | AnyFetch;

async function fetchRawSolidDocument(url: string, fetch: Fetch): Promise<string> {
    const options = {
        headers: { Accept: 'text/turtle' },
    };

    try {
        const response = await fetch(url, options);

        if ([401, 403].includes(response.status))
            throw new UnauthorizedError(url, response.status);

        return await response.text();
    } catch (error) {
        if (error instanceof UnauthorizedError)
            throw error;

        throw new NetworkRequestError(url);
    }
}

export interface ParsingOptions {
    documentUrl: string;
}

export async function fetchSolidDocument(url: string, fetch?: Fetch): Promise<SolidDocument> {
    const data = await fetchRawSolidDocument(url, fetch ?? window.fetch);
    const statements = await turtleToQuads(data, { documentUrl: url });

    return new SolidDocument(url, statements);
}

export function normalizeSparql(sparql: string): string {
    const quads = sparqlToQuads(sparql);

    return Object
        .entries(quads)
        .reduce((normalizedOperations, [operation, quads]) => {
            const normalizedQuads = quads.map(quad => '    ' + quadToTurtle(quad)).sort().join('\n');

            return normalizedOperations.concat(`${operation.toUpperCase()} DATA {\n${normalizedQuads}\n}`);
        }, [] as string[])
        .join(' ;\n');
}

export function quadToTurtle(quad: Quad): string {
    const writer = new TurtleWriter;

    return writer.quadsToString([quad]).slice(0, -1);
}

export function sparqlToQuads(sparql: string): Record<string, Quad[]> {
    const operations = sparql.matchAll(/(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    for (const operation of operations) {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = turtleToQuadsSync(operationBody);
    }

    return quads;
}

export function turtleToQuadsSync(turtle: string, options: Partial<ParsingOptions> = {}): Quad[] {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.documentUrl });
    const parser = new TurtleParser(parserOptions);

    try {
        return parser.parse(turtle);
    } catch (error) {
        throw new MalformedSolidDocumentError(options.documentUrl ?? null, SolidDocumentFormat.Turtle, error.message);
    }
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
                resolve(quads);
                return;
            }

            quads.push(quad);
        });
    });
}
