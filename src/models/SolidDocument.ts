import { getLinkHeaderUrl, getLinkHeaderUrls } from '@noeldemartin/solid-utils/helpers/links';
import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';
import { arrayFilter, parseDate, stringMatch } from '@noeldemartin/utils';
import type { Quad } from '@rdfjs/types';

import SolidStore from './SolidStore';

export const SolidDocumentPermissions = {
    Read: 'read',
    Write: 'write',
    Append: 'append',
    Control: 'control',
} as const;

export type SolidDocumentPermission = (typeof SolidDocumentPermissions)[keyof typeof SolidDocumentPermissions];

export default class SolidDocument extends SolidStore {
    public readonly url: string;
    public readonly headers: Headers;

    public constructor(url: string, quads?: Quad[], headers?: Headers) {
        super(quads);

        this.url = url;
        this.headers = headers ?? new Headers();
    }

    public isACPResource(): boolean {
        return getLinkHeaderUrls(this.headers, 'type').includes('http://www.w3.org/ns/solid/acp#AccessControlResource');
    }

    public isPersonalProfile(): boolean {
        return !!this.statement(this.url, expandIRI('rdf:type'), expandIRI('foaf:PersonalProfileDocument'));
    }

    public isStorage(): boolean {
        return getLinkHeaderUrls(this.headers, 'type').includes('http://www.w3.org/ns/pim/space#Storage');
    }

    public isUserWritable(): boolean {
        return this.getUserPermissions().includes(SolidDocumentPermissions.Write);
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
            null
        );
    }

    public getDescriptionUrl(): string {
        return getLinkHeaderUrl(this.headers, 'describedBy', { baseUrl: this.url }) ?? `${this.url}.meta`;
    }

    protected expandIRI(iri: string): string {
        return expandIRI(iri, { defaultPrefix: this.url });
    }

    private getPermissionsFromWAC(type: string): SolidDocumentPermission[] {
        const wacAllow = this.headers.get('WAC-Allow') ?? '';
        const publicModes = stringMatch<2>(wacAllow, new RegExp(`${type}="([^"]+)"`))?.[1] ?? '';

        return arrayFilter([
            publicModes.includes('read') && SolidDocumentPermissions.Read,
            publicModes.includes('write') && SolidDocumentPermissions.Write,
            publicModes.includes('append') && SolidDocumentPermissions.Append,
            publicModes.includes('control') && SolidDocumentPermissions.Control,
        ]);
    }
}
