import { BlankNode as N3BlankNode, Quad as N3Quad } from 'n3';
import type { BlankNode, Quad } from 'rdf-js';
import type { Term } from 'n3';

export function createBlankNode(name: string): BlankNode {
    return new N3BlankNode(name);
}

export function createQuad(subject: Term, predicate: Term, object: Term, graph?: Term): Quad {
    return new N3Quad(subject, predicate, object, graph);
}

export { fromRDF as jsonLDFromRDF, toRDF as jsonLDToRDF, compact as compactJsonLD } from 'jsonld';
export { Parser as TurtleParser, Writer as TurtleWriter } from 'n3';
export type { JsonLdDocument } from 'jsonld';
export type { Term } from 'n3';
