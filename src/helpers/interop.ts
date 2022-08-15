import { uuid } from '@noeldemartin/utils';

import { createSolidDocument, fetchSolidDocument, solidDocumentExists, updateSolidDocument } from '@/helpers/io';
import type { Fetch } from '@/helpers/io';
import type { SolidUserProfile } from '@/helpers/auth';

type TypeIndexType = 'public' | 'private';

async function mintTypeIndexUrl(user: SolidUserProfile, type: TypeIndexType, fetch?: Fetch): Promise<string> {
    fetch = fetch ?? window.fetch.bind(fetch);

    const storageUrl = user.storageUrls[0];
    const typeIndexUrl = `${storageUrl}settings/${type}TypeIndex`;

    return await solidDocumentExists(typeIndexUrl, fetch)
        ? `${storageUrl}settings/${type}TypeIndex-${uuid()}`
        : typeIndexUrl;
}

async function createTypeIndex(user: SolidUserProfile, type: TypeIndexType, fetch?: Fetch) {
    if (user.writableProfileUrl === null) {
        throw new Error('Can\'t create type index without a writable profile document');
    }

    fetch = fetch ?? window.fetch.bind(fetch);

    const typeIndexUrl = await mintTypeIndexUrl(user, type, fetch);
    const typeIndexBody = type === 'public'
        ? '<> a <http://www.w3.org/ns/solid/terms#TypeIndex> .'
        : `
            <> a
                <http://www.w3.org/ns/solid/terms#TypeIndex>,
                <http://www.w3.org/ns/solid/terms#UnlistedDocument> .
        `;
    const profileUpdateBody = `
        INSERT DATA {
            <${user.webId}> <http://www.w3.org/ns/solid/terms#${type}TypeIndex> <${typeIndexUrl}> .
        }
    `;

    await Promise.all([
        createSolidDocument(typeIndexUrl, typeIndexBody, fetch),
        updateSolidDocument(user.writableProfileUrl, profileUpdateBody, fetch),
    ]);

    if (type === 'public') {
        // TODO Implement updating ACLs for the listing itself to public
    }

    return typeIndexUrl;
}

async function findRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    predicate: string,
    fetch?: Fetch,
): Promise<string[]> {
    const typeIndex = await fetchSolidDocument(typeIndexUrl, fetch);
    const types = Array.isArray(type) ? type : [type];

    return types.map(
        type => typeIndex
            .statements(undefined, 'rdf:type', 'solid:TypeRegistration')
            .filter(statement => typeIndex.contains(statement.subject.value, 'solid:forClass', type))
            .map(statement => typeIndex.statements(statement.subject.value, predicate))
            .flat()
            .map(statement => statement.object.value)
            .filter(url => !!url),
    ).flat();
}

export async function createPublicTypeIndex(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'public', fetch);
}

export async function createPrivateTypeIndex(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'private', fetch);
}

export async function findContainerRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instanceContainer', fetch);
}

export async function findInstanceRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instance', fetch);
}
