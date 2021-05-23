import { Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
import type { Quad } from 'rdf-js';

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

        quads[operationName] = turtleToQuads(operationBody);
    }

    return quads;
}

export function turtleToQuads(turtle: string): Quad[] {
    const parser = new TurtleParser;

    return parser.parse(turtle);
}
