/*
 * Everything in this file is only kept for soukai-solid, and it can be removed once soukai-solid is sunset.
 * soukai-bis implements this functionality in its TypeIndex and Container models.
 */

import type { CompleteSolidUserProfile } from '@noeldemartin/solid-utils/helpers/auth';
import {
    createSolidDocument,
    fetchSolidDocument,
    solidDocumentExists,
    updateSolidDocument,
} from '@noeldemartin/solid-utils/helpers/io';
import type { Fetch } from '@noeldemartin/solid-utils/helpers/io';
import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';
import RDFNamedNode from '@noeldemartin/solid-utils/rdf/RDFNamedNode';
import RDFQuad from '@noeldemartin/solid-utils/rdf/RDFQuad';
import SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import { uuid } from '@noeldemartin/utils';

type TypeIndexType = 'public' | 'private';

async function mintTypeIndexUrl(user: CompleteSolidUserProfile, type: TypeIndexType, fetch: Fetch): Promise<string> {
    const url = `${user.storageUrls[0]}settings/${type}TypeIndex`;

    return (await solidDocumentExists(url, { fetch })) ? `${url}-${uuid()}` : url;
}

async function createTypeIndex(user: CompleteSolidUserProfile, type: TypeIndexType, fetch?: Fetch) {
    if (user.writableProfileUrl === null) {
        throw new Error("Can't create type index without a writable profile document");
    }

    fetch = fetch ?? window.fetch.bind(window);

    const typeIndexUrl = await mintTypeIndexUrl(user, type, fetch);
    const typeIndexBody =
        type === 'public'
            ? '<> a <http://www.w3.org/ns/solid/terms#TypeIndex> .'
            : `
            <> a
                <http://www.w3.org/ns/solid/terms#TypeIndex>,
                <http://www.w3.org/ns/solid/terms#UnlistedDocument> .
        `;

    await createSolidDocument(typeIndexUrl, typeIndexBody, { fetch });
    await updateSolidDocument(
        user.writableProfileUrl,
        new SparqlUpdate().insert(
            new RDFQuad(
                new RDFNamedNode(user.webId),
                new RDFNamedNode(expandIRI(`solid:${type}TypeIndex`)),
                new RDFNamedNode(typeIndexUrl),
            ),
        ),
        { fetch },
    );

    return typeIndexUrl;
}

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
                .filter((url) => !!url),
        )
        .flat();
}

/**
 * @deprecated Use soukai-bis TypeIndex.createPublic() instead
 */
export async function createPublicTypeIndex(user: CompleteSolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'public', fetch);
}

/**
 * @deprecated Use soukai-bis TypeIndex.createPrivate() instead
 */
export async function createPrivateTypeIndex(user: CompleteSolidUserProfile, fetch?: Fetch): Promise<string> {
    return createTypeIndex(user, 'private', fetch);
}

/**
 * @deprecated Use soukai-bis TypeIndex.findContainer() or Container.createFromTypeIndex() instead
 */
export async function findContainerRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instanceContainer', fetch);
}

/**
 * @deprecated Use soukai-bis TypeIndex registrations instead
 */
export async function findInstanceRegistrations(
    typeIndexUrl: string,
    type: string | string[],
    fetch?: Fetch,
): Promise<string[]> {
    return findRegistrations(typeIndexUrl, type, 'solid:instance', fetch);
}
