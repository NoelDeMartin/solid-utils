import { parseDate } from '@noeldemartin/utils';
import type { Quad } from 'rdf-js';

import { expandIRI } from '@/helpers/vocabs';

import SolidThing from './SolidThing';

export default class SolidDocument {

    public readonly url: string;
    public readonly headers: Headers;
    private quads: Quad[];

    public constructor(url: string, quads: Quad[], headers: Headers) {
        this.url = url;
        this.quads = quads;
        this.headers = headers;
    }

    public isEmpty(): boolean {
        return this.statements.length === 0;
    }

    public isPersonalProfile(): boolean {
        return !!this.statement(
            this.url,
            expandIRI('rdfs:type'),
            expandIRI('foaf:PersonalProfileDocument'),
        );
    }

    public isStorage(): boolean {
        return !!this.headers.get('Link')?.match(/<http:\/\/www\.w3\.org\/ns\/pim\/space#Storage>;[^,]+rel="type"/);
    }

    public getLastModified(): Date | null {
        return parseDate(this.headers.get('last-modified'))
            ?? parseDate(this.statement(this.url, 'purl:modified')?.object.value)
            ?? this.getLatestDocumentDate()
            ?? null;
    }

    public statements(subject?: string, predicate?: string, object?: string): Quad[] {
        return this.quads.filter(
            statement =>
                (!object || statement.object.value === expandIRI(object, { defaultPrefix: this.url })) &&
                (!subject || statement.subject.value === expandIRI(subject, { defaultPrefix: this.url })) &&
                (!predicate || statement.predicate.value === expandIRI(predicate, { defaultPrefix: this.url })),
        );
    }

    public statement(subject?: string, predicate?: string, object?: string): Quad | null {
        const statement = this.quads.find(
            statement =>
                (!object || statement.object.value === expandIRI(object, { defaultPrefix: this.url })) &&
                (!subject || statement.subject.value === expandIRI(subject, { defaultPrefix: this.url })) &&
                (!predicate || statement.predicate.value === expandIRI(predicate, { defaultPrefix: this.url })),
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

    private getLatestDocumentDate(): Date | null {
        const dates = [
            ...this.statements(undefined, 'purl:modified'),
            ...this.statements(undefined, 'purl:created'),
        ]
            .map(statement => parseDate(statement.object.value))
            .filter((date): date is Date => date !== null);

        return dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;
    }

}
