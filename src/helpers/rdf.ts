import jsonld from 'jsonld';
import md5 from 'md5';
import { arr, arrayFilter, arrayReplace, objectWithoutEmpty, stringMatchAll, tap } from '@noeldemartin/utils';
import { BlankNode as N3BlankNode, Quad as N3Quad, Parser, Writer } from 'n3';
import type { JsonLdDocument } from 'jsonld';
import type { Quad } from '@rdfjs/types';
import type { Term } from 'n3';

// eslint-disable-next-line max-len
import MalformedSolidDocumentError, { SolidDocumentFormat } from '@noeldemartin/solid-utils/errors/MalformedSolidDocumentError';

import { isJsonLDGraph } from '@noeldemartin/solid-utils/helpers/jsonld';
import type { JsonLD, JsonLDGraph, JsonLDResource } from '@noeldemartin/solid-utils/helpers/jsonld';

const ANONYMOUS_PREFIX = 'anonymous://';
const ANONYMOUS_PREFIX_LENGTH = ANONYMOUS_PREFIX.length;

function normalizeBlankNodes(quads: Quad[]): Quad[] {
    const normalizedQuads = quads.slice(0);
    const quadsIndexes: Record<string, Set<number>> = {};
    const blankNodeIds = arr(quads)
        .flatMap((quad, index) =>
            tap(
                arrayFilter([
                    quad.object.termType === 'BlankNode' ? quad.object.value : null,
                    quad.subject.termType === 'BlankNode' ? quad.subject.value : null,
                ]),
                (ids) => ids.forEach((id) => (quadsIndexes[id] ??= new Set()).add(index)),
            ))
        .filter()
        .unique();

    for (const originalId of blankNodeIds) {
        const quadIndexes = quadsIndexes[originalId] as Set<number>;
        const normalizedId = md5(
            arr(quadIndexes)
                .map((index) => quads[index] as Quad)
                .filter(({ subject: { termType, value } }) => termType === 'BlankNode' && value === originalId)
                .map(({ predicate, object }) =>
                    object.termType === 'BlankNode' ? predicate.value : predicate.value + object.value)
                .sorted()
                .join(),
        );

        for (const index of quadIndexes) {
            const quad = normalizedQuads[index] as Quad;
            const terms: Record<string, Term> = {
                subject: quad.subject as Term,
                object: quad.object as Term,
            };

            for (const [termName, termValue] of Object.entries(terms)) {
                if (termValue.termType !== 'BlankNode' || termValue.value !== originalId) continue;

                terms[termName] = new N3BlankNode(normalizedId) as Term;
            }

            arrayReplace(
                normalizedQuads,
                quad,
                new N3Quad(terms.subject as Term, quad.predicate as Term, terms.object as Term),
            );
        }
    }

    return normalizedQuads;
}

function normalizeQuads(quads: Quad[]): string {
    return quads
        .map((quad) => '    ' + quadToTurtle(quad))
        .sort()
        .join('\n');
}

function preprocessSubjects(json: JsonLD): void {
    if (!json['@id']?.startsWith('#')) {
        return;
    }

    json['@id'] = ANONYMOUS_PREFIX + json['@id'];

    for (const [field, value] of Object.entries(json)) {
        if (typeof value !== 'object' || value === null || !('@id' in value)) {
            continue;
        }

        preprocessSubjects(json[field] as JsonLD);
    }
}

function postprocessSubjects(quads: Quad[]): void {
    for (const quad of quads) {
        if (quad.subject.value.startsWith(ANONYMOUS_PREFIX)) {
            quad.subject.value = quad.subject.value.slice(ANONYMOUS_PREFIX_LENGTH);
        }

        if (quad.object.value.startsWith(ANONYMOUS_PREFIX)) {
            quad.object.value = quad.object.value.slice(ANONYMOUS_PREFIX_LENGTH);
        }
    }
}

export interface ParsingOptions {
    baseIRI: string;
    normalizeBlankNodes: boolean;
}

export interface RDFGraphData {
    quads: Quad[];
    containsRelativeIRIs: boolean;
}

export async function sparqlToQuads(
    sparql: string,
    options: Partial<ParsingOptions> = {},
): Promise<Record<string, Quad[]>> {
    const operations = stringMatchAll<3>(sparql, /(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    await Promise.all(
        [...operations].map(async (operation) => {
            const operationName = operation[1].toLowerCase();
            const operationBody = operation[2];

            quads[operationName] = await turtleToQuads(operationBody, options);
        }),
    );

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
    const parser = new Parser(parserOptions);

    try {
        const quads = parser.parse(turtle);

        return options.normalizeBlankNodes ? normalizeBlankNodes(quads) : quads;
    } catch (error) {
        throw new MalformedSolidDocumentError(
            options.baseIRI ?? null,
            SolidDocumentFormat.Turtle,
            (error as Error).message ?? '',
        );
    }
}

export async function jsonldToQuads(json: JsonLD, baseIRI?: string): Promise<Quad[]> {
    if (isJsonLDGraph(json)) {
        const graphQuads = await Promise.all(json['@graph'].map((resource) => jsonldToQuads(resource, baseIRI)));

        return graphQuads.flat();
    }

    preprocessSubjects(json);

    const quads = await (jsonld.toRDF(json as JsonLdDocument, { base: baseIRI }) as Promise<Quad[]>);

    postprocessSubjects(quads);

    return quads;
}

export async function normalizeJsonLD(json: JsonLD, baseIRI?: string): Promise<JsonLD> {
    const quads = await jsonldToQuads(structuredClone(json), baseIRI);

    return quadsToJsonLD(quads);
}

export function normalizeSparql(sparql: string): string {
    const quads = sparqlToQuadsSync(sparql);

    return Object.entries(quads)
        .reduce((normalizedOperations, [operation, _quads]) => {
            const normalizedQuads = normalizeQuads(_quads);

            return normalizedOperations.concat(`${operation.toUpperCase()} DATA {\n${normalizedQuads}\n}`);
        }, [] as string[])
        .join(' ;\n');
}

export function normalizeTurtle(sparql: string): string {
    const quads = turtleToQuadsSync(sparql);

    return normalizeQuads(quads);
}

export function parseTurtle(turtle: string, options: Partial<ParsingOptions> = {}): Promise<RDFGraphData> {
    const parserOptions = objectWithoutEmpty({ baseIRI: options.baseIRI });
    const parser = new Parser(parserOptions);
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
                    new MalformedSolidDocumentError(options.baseIRI ?? null, SolidDocumentFormat.Turtle, error.message),
                );

                return;
            }

            if (!quad) {
                resolve(data);

                return;
            }

            data.quads.push(quad);
        });
    });
}

export async function quadsToJsonLD(quads: Quad[]): Promise<JsonLDGraph> {
    const graph = await jsonld.fromRDF(quads);

    return {
        '@graph': graph as JsonLDResource[],
    };
}

export function quadsToTurtle(quads: Quad[]): string {
    const writer = new Writer();

    return writer.quadsToString(quads);
}

export function quadToTurtle(quad: Quad): string {
    const writer = new Writer();

    return writer.quadsToString([quad]).slice(0, -1);
}
