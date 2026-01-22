import { arrayFilter, parseDate, stringMatch, urlResolve } from '@noeldemartin/utils';
import type { Quad } from '@rdfjs/types';

import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

import SolidStore from './SolidStore';

export enum SolidDocumentPermission {
    Read = 'read',
    Write = 'write',
    Append = 'append',
    Control = 'control',
}

export default class SolidDocument extends SolidStore {

    public readonly url: string;
    public readonly headers: Headers;

    public constructor(url: string, quads?: Quad[], headers?: Headers) {
        super(quads);

        this.url = url;
        this.headers = headers ?? new Headers();
    }

    public isACPResource(): boolean {
        return !!this.headers
            .get('Link')
            ?.match(/<http:\/\/www\.w3\.org\/ns\/solid\/acp#AccessControlResource>;[^,]+rel="type"/);
    }

    public isPersonalProfile(): boolean {
        return !!this.statement(this.url, expandIRI('rdf:type'), expandIRI('foaf:PersonalProfileDocument'));
    }

    public isStorage(): boolean {
        return !!this.headers.get('Link')?.match(/<http:\/\/www\.w3\.org\/ns\/pim\/space#Storage>;[^,]+rel="type"/);
    }

    public isUserWritable(): boolean {
        return this.getUserPermissions().includes(SolidDocumentPermission.Write);
    }

    public getUserPermissions(): SolidDocumentPermission[] {
        return this.getPermissionsFromWAC('user');
    }

    public getPublicPermissions(): SolidDocumentPermission[] {
        return this.getPermissionsFromWAC('public');
    }

    public getLastModified(): Date | null {
        return (
            parseDate(this.headers.get('last-modified')) ??
            parseDate(this.statement(this.url, 'purl:modified')?.object.value) ??
            this.getLatestDocumentDate() ??
            null
        );
    }

    public getDescriptionUrl(): string | undefined {
        if (!this.headers?.has('Link')) {
            return undefined;
        }

        const matches = this.headers.get('Link')?.match(/<([^>]+)>;\s*rel="describedBy"/i);

        if (!matches) {
            return undefined;
        }

        return urlResolve(this.url, matches[1] as string);
    }

    protected expandIRI(iri: string): string {
        return expandIRI(iri, { defaultPrefix: this.url });
    }

    private getLatestDocumentDate(): Date | null {
        const dates = [...this.statements(undefined, 'purl:modified'), ...this.statements(undefined, 'purl:created')]
            .map((statement) => parseDate(statement.object.value))
            .filter((date): date is Date => date !== null);

        return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
    }

    private getPermissionsFromWAC(type: string): SolidDocumentPermission[] {
        const wacAllow = this.headers.get('WAC-Allow') ?? '';
        const publicModes = stringMatch<2>(wacAllow, new RegExp(`${type}="([^"]+)"`))?.[1] ?? '';

        return arrayFilter([
            publicModes.includes('read') && SolidDocumentPermission.Read,
            publicModes.includes('write') && SolidDocumentPermission.Write,
            publicModes.includes('append') && SolidDocumentPermission.Append,
            publicModes.includes('control') && SolidDocumentPermission.Control,
        ]);
    }

}
