import type {
    BlankNode,
    Literal,
    NamedNode,
    Quad,
    Quad_Object,
    Quad_Predicate,
    Quad_Subject,
    Variable,
} from '@rdfjs/types';

import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

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

    public statements(
        subject?: Quad_Subject | string,
        predicate?: Quad_Predicate | string,
        object?: Quad_Object | string,
    ): Quad[] {
        return this.quads.filter(
            (statement) =>
                (!object || this.termMatches(statement.object, object)) &&
                (!subject || this.termMatches(statement.subject, subject)) &&
                (!predicate || this.termMatches(statement.predicate, predicate)),
        );
    }

    public statement(
        subject?: Quad_Subject | string,
        predicate?: Quad_Predicate | string,
        object?: Quad_Object | string,
    ): Quad | null {
        const statement = this.quads.find(
            (_statement) =>
                (!object || this.termMatches(_statement.object, object)) &&
                (!subject || this.termMatches(_statement.subject, subject)) &&
                (!predicate || this.termMatches(_statement.predicate, predicate)),
        );

        return statement ?? null;
    }

    public contains(
        subject: Quad_Subject | string,
        predicate?: Quad_Predicate | string,
        object?: Quad_Object | string,
    ): boolean {
        return this.statement(subject, predicate, object) !== null;
    }

    public getThing(subject: Quad_Subject | string): SolidThing {
        const statements = this.statements(subject);

        return new SolidThing(typeof subject === 'string' ? subject : subject.value, statements);
    }

    protected termMatches(term: Term, value: Term | string): boolean {
        if (typeof value === 'string') {
            return expandIRI(value) === term.value;
        }

        return term.equals(value);
    }

}
