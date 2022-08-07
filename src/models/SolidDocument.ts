import { parseDate } from '@noeldemartin/utils';
import type { Quad } from 'rdf-js';

import { expandIRI } from '@/helpers/vocabs';

import SolidStore from './SolidStore';

export default class SolidDocument extends SolidStore {

    public readonly url: string;
    public readonly headers: Headers;

    public constructor(url: string, quads: Quad[], headers: Headers) {
        super(quads);

        this.url = url;
        this.headers = headers;
    }

    public isPersonalProfile(): boolean {
        return !!this.statement(
            this.url,
            expandIRI('rdf:type'),
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

    protected expandIRI(iri: string): string {
        return expandIRI(iri, { defaultPrefix: this.url });
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
