import type { BlankNode, Literal, NamedNode, Quad, Variable } from 'rdf-js';

import { expandIRI } from '@/helpers/vocabs';

import SolidThing from './SolidThing';

export type Term = NamedNode | Literal | BlankNode | Quad | Variable;

export default class SolidStore {

    private quads: Quad[];

    public constructor(quads: Quad[] = []) {
        this.quads = quads;
    }

    public isEmpty(): boolean {
        return this.statements.length === 0;
    }

    public getQuads(): Quad[] {
        return this.quads.slice(0);
    }

    public addQuads(quads: Quad[]): void {
        this.quads.push(...quads);
    }

    public statements(subject?: Term | string, predicate?: Term | string, object?: Term | string): Quad[] {
        return this.quads.filter(
            statement =>
                (!object || this.termMatches(statement.object, object)) &&
                (!subject || this.termMatches(statement.subject, subject)) &&
                (!predicate || this.termMatches(statement.predicate, predicate)),
        );
    }

    public statement(subject?: Term | string, predicate?: Term | string, object?: Term | string): Quad | null {
        const statement = this.quads.find(
            statement =>
                (!object || this.termMatches(statement.object, object)) &&
                (!subject || this.termMatches(statement.subject, subject)) &&
                (!predicate || this.termMatches(statement.predicate, predicate)),
        );

        return statement ?? null;
    }

    public contains(subject: string, predicate?: string, object?: string): boolean {
        return this.statement(subject, predicate, object) !== null;
    }

    public getThing(subject: string): SolidThing {
        const statements = this.statements(subject);

        return new SolidThing(subject, statements);
    }

    protected expandIRI(iri: string): string {
        return expandIRI(iri);
    }

    protected termMatches(term: Term, value: Term | string): boolean {
        if (typeof value === 'string') {
            return this.expandIRI(value) === term.value;
        }

        return term.termType === term.termType && term.value === value.value;
    }

}
