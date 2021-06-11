import type { Quad } from 'rdf-js';

import { expandIRI } from '@/helpers/vocabs';

import SolidThing from './SolidThing';

export default class SolidDocument {

    public readonly url: string;
    private quads: Quad[];

    public constructor(url: string, quads: Quad[]) {
        this.url = url;
        this.quads = quads;
    }

    public statements(subject?: string, predicate?: string, object?: string): Quad[] {
        return this.quads.filter(
            statement =>
                (!object || statement.object.value === expandIRI(object, this.url)) &&
                (!subject || statement.subject.value === expandIRI(subject, this.url)) &&
                (!predicate || statement.predicate.value === expandIRI(predicate, this.url)),
        );
    }

    public statement(subject?: string, predicate?: string, object?: string): Quad | null {
        const statement = this.quads.find(
            statement =>
                (!object || statement.object.value === expandIRI(object, this.url)) &&
                (!subject || statement.subject.value === expandIRI(subject, this.url)) &&
                (!predicate || statement.predicate.value === expandIRI(predicate, this.url)),
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

}
