import type { Quad } from 'rdf-js';

import { expandIRI } from '@/helpers/vocabs';

import SolidThing from './SolidThing';

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

    public statements(subject?: string, predicate?: string, object?: string): Quad[] {
        return this.quads.filter(
            statement =>
                (!object || statement.object.value === this.expandIRI(object)) &&
                (!subject || statement.subject.value === this.expandIRI(subject)) &&
                (!predicate || statement.predicate.value === this.expandIRI(predicate)),
        );
    }

    public statement(subject?: string, predicate?: string, object?: string): Quad | null {
        const statement = this.quads.find(
            statement =>
                (!object || statement.object.value === this.expandIRI(object)) &&
                (!subject || statement.subject.value === this.expandIRI(subject)) &&
                (!predicate || statement.predicate.value === this.expandIRI(predicate)),
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

}
