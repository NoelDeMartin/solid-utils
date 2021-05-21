import { Parser as TurtleParser } from 'n3';
import type { Quad } from 'rdf-js';

export function turtleToQuads(turtle: string): Quad[] {
    const parser = new TurtleParser;

    return parser.parse(turtle);
}
