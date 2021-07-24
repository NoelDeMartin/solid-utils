import { uuid } from '@noeldemartin/utils';

import { createSolidDocument, fetchSolidDocument, solidDocumentExists, updateSolidDocument } from '@/helpers/io';
import type SolidThing from '@/models/SolidThing';
import type { Fetch } from '@/helpers/io';
import type { SolidUserProfile } from '@/helpers/auth';

async function mintPrivateTypeIndexUrl(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    fetch = fetch ?? window.fetch;

    const storageUrl = user.storageUrls[0];
    const typeIndexUrl = `${storageUrl}settings/privateTypeIndex`;

    return await solidDocumentExists(typeIndexUrl, fetch)
        ? `${storageUrl}settings/privateTypeIndex-${uuid()}`
        : typeIndexUrl;
}

export async function createPrivateTypeIndex(user: SolidUserProfile, fetch?: Fetch): Promise<string> {
    fetch = fetch ?? window.fetch;

    const typeIndexUrl = await mintPrivateTypeIndexUrl(user, fetch);
    const typeIndexBody = `
        <> a
            <http://www.w3.org/ns/solid/terms#TypeIndex>,
            <http://www.w3.org/ns/solid/terms#UnlistedDocument> .
    `;
    const profileUpdateBody = `
        INSERT DATA {
            <${user.webId}> <http://www.w3.org/ns/solid/terms#privateTypeIndex> <${typeIndexUrl}> .
        }
    `;

    createSolidDocument(typeIndexUrl, typeIndexBody, fetch);
    updateSolidDocument(user.webId, profileUpdateBody, fetch);

    return typeIndexUrl;
}

export async function findContainerRegistration(
    typeIndexUrl: string,
    childrenType: string,
    fetch?: Fetch,
): Promise<SolidThing | null> {
    const typeIndex = await fetchSolidDocument(typeIndexUrl, fetch);
    const containerQuad = typeIndex
        .statements(undefined, 'rdfs:type', 'solid:TypeRegistration')
        .find(
            statement =>
                typeIndex.contains(statement.subject.value, 'solid:forClass', childrenType) &&
                typeIndex.contains(statement.subject.value, 'solid:instanceContainer'),
        );

    return containerQuad
        ? typeIndex.getThing(containerQuad.subject.value) ?? null
        : null;
}
