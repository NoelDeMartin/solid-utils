import { Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
import type { Quad } from 'rdf-js';

export function quadToTurtle(quad: Quad): string {
    const writer = new TurtleWriter;

    return writer.quadsToString([quad]);
}

export function sparqlToQuads(sparql: string): Record<string, Quad[]> {
    const operations = sparql.matchAll(/(\w+) DATA {([^}]+)}/g);
    const quads: Record<string, Quad[]> = {};

    for (const operation of operations) {
        const operationName = operation[1].toLowerCase();
        const operationBody = operation[2];

        quads[operationName] = turtleToQuads(operationBody);
    }

    return quads;
}

export function turtleToQuads(turtle: string): Quad[] {
    const parser = new TurtleParser;

    return parser.parse(turtle);
}
