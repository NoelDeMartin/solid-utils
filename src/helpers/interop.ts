import { uuid } from '@noeldemartin/utils';

import {
    createSolidDocument,
    fetchSolidDocument,
    solidDocumentExists,
    updateSolidDocument,
} from '@noeldemartin/solid-utils/helpers/io';
import type { Fetch } from '@noeldemartin/solid-utils/helpers/io';
import type { SolidUserProfile } from '@noeldemartin/solid-utils/helpers/auth';

type TypeIndexType = 'public' | 'private';

async function mintTypeIndexUrl(user: SolidUserProfile, type: TypeIndexType, fetch?: Fetch): Promise<string> {
    fetch = fetch ?? window.fetch.bind(fetch);

    const storageUrl = user.storageUrls[0];
    const typeIndexUrl = `${storageUrl}settings/${type}TypeIndex`;

    return (await solidDocumentExists(typeIndexUrl, { fetch }))
        ? `${storageUrl}settings/${type}TypeIndex-${uuid()}`
        : typeIndexUrl;
}

async function createTypeIndex(user: SolidUserProfile, type: TypeIndexType, fetch?: Fetch) {
    if (user.writableProfileUrl === null) {
        throw new Error('Can\'t create type index without a writable profile document');
    }

    fetch = fetch ?? window.fetch.bind(fetch);

    const typeIndexUrl = await mintTypeIndexUrl(user, type, fetch);
    const typeIndexBody =
        type === 'public'
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

    await createSolidDocument(typeIndexUrl, typeIndexBody, { fetch });
    await updateSolidDocument(user.writableProfileUrl, profileUpdateBody, { fetch });

    if (type === 'public') {
        // TODO This is currently implemented in soukai-solid.
    }

    return typeIndexUrl;
}

/**
 * @deprecated Use soukai-solid instead
 */
async function findRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    predicate: string,
    fetch?: Fetch,
): Promise<string[]> {
    const typeIndex = await fetchSolidDocument(typeIndexUrl, { fetch });
    const types = Array.isArray(type) ? type : [type];

    return types
        .map((_type) =>
            typeIndex
                .statements(undefined, 'rdf:type', 'solid:TypeRegistration')
                .filter((statement) => typeIndex.contains(statement.subject.value, 'solid:forClass', _type))
                .map((statement) => typeIndex.statements(statement.subject.value, predicate))
                .flat()
                .map((statement) => statement.object.value)
                .filter((url) => !!url))
        .flat();
}

/**
 * @deprecated Use soukai-solid instead
 */
export async function createPublicTypeIndex(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'public', fetch);
}

/**
 * @deprecated Use soukai-solid instead
 */
export async function createPrivateTypeIndex(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'private', fetch);
}

/**
 * @deprecated Use soukai-solid instead
 */
export async function findContainerRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instanceContainer', fetch);
}

/**
 * @deprecated Use soukai-solid instead
 */
export async function findInstanceRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instance', fetch);
}
