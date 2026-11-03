import CloakedPreferencesFile from '@noeldemartin/solid-utils/errors/CloakedPreferencesFile';
import type { CompleteSolidUserProfile } from '@noeldemartin/solid-utils/helpers/authentication';
import { createSolidDocument, solidDocumentExists, updateSolidDocument } from '@noeldemartin/solid-utils/helpers/io';
import type { FetchOptions } from '@noeldemartin/solid-utils/helpers/io';
import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';
import RDFNamedNode from '@noeldemartin/solid-utils/rdf/RDFNamedNode';
import RDFQuad from '@noeldemartin/solid-utils/rdf/RDFQuad';
import SparqlUpdate from '@noeldemartin/solid-utils/rdf/SparqlUpdate';
import { uuid } from '@noeldemartin/utils';

export async function mintSettingsDocumentUrl(
    user: CompleteSolidUserProfile,
    name: string,
    options: FetchOptions = {},
): Promise<string> {
    const url = `${user.storageUrls[0]}settings/${name}`;

    return (await solidDocumentExists(url, options)) ? `${url}-${uuid()}` : url;
}

export async function linkFromDocument(
    documentUrl: string,
    webId: string,
    predicate: string,
    url: string,
    options: FetchOptions = {},
): Promise<void> {
    const update = new SparqlUpdate().insert(
        new RDFQuad(new RDFNamedNode(webId), new RDFNamedNode(expandIRI(predicate)), new RDFNamedNode(url)),
    );

    await updateSolidDocument(documentUrl, update, options);
}

export async function findOrCreatePreferencesFile(
    user: CompleteSolidUserProfile,
    options: FetchOptions = {},
): Promise<string> {
    if (user.preferencesFileUrl) {
        return user.preferencesFileUrl;
    }

    if (user.writableProfileUrl === null) {
        throw new Error("Can't create preferences file without a writable profile document");
    }

    const cloakedDocumentUrl = user.cloakedDocumentUrls.find((url) =>
        user.storageUrls.some((storageUrl) => url.startsWith(storageUrl)),
    );

    if (cloakedDocumentUrl) {
        throw new CloakedPreferencesFile(
            cloakedDocumentUrl,
            `Can't create preferences file because the document at ${cloakedDocumentUrl} ` +
                'could not be read (it may already link one)',
        );
    }

    const preferencesFileUrl = await mintSettingsDocumentUrl(user, 'preferences', options);

    await createSolidDocument(preferencesFileUrl, '<> a <http://www.w3.org/ns/pim/space#ConfigurationFile> .', options);
    await linkFromDocument(user.writableProfileUrl, user.webId, 'pim:preferencesFile', preferencesFileUrl, options);

    return preferencesFileUrl;
}
