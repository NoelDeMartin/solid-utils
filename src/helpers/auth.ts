import { arrayUnique, objectWithoutEmpty, silenced, urlParentDirectory, urlRoot, urlRoute } from '@noeldemartin/utils';

import SolidStore from '../models/SolidStore';
import UnauthorizedError from '../errors/UnauthorizedError';
import type SolidDocument from '../models/SolidDocument';

import { fetchSolidDocument } from './io';
import type { Fetch, FetchSolidDocumentOptions } from './io';

export interface SolidUserProfile {
    webId: string;
    storageUrls: [string, ...string[]];
    cloaked: boolean;
    writableProfileUrl: string | null;
    name?: string;
    avatarUrl?: string;
    oidcIssuerUrl?: string;
    publicTypeIndexUrl?: string;
    privateTypeIndexUrl?: string;
}

async function fetchExtendedUserProfile(
    webIdDocument: SolidDocument,
    options?: FetchSolidDocumentOptions,
): Promise<{
    store: SolidStore;
    cloaked: boolean;
    writableProfileUrl: string | null;
}> {
    const store = new SolidStore(webIdDocument.getQuads());
    const documents: Record<string, SolidDocument | false | null> = { [webIdDocument.url]: webIdDocument };
    const addReferencedDocumentUrls = (document: SolidDocument) => {
        document
            .statements(undefined, 'foaf:isPrimaryTopicOf')
            .map((quad) => quad.object.value)
            .forEach((profileDocumentUrl) => (documents[profileDocumentUrl] = documents[profileDocumentUrl] ?? null));
        document
            .statements(undefined, 'foaf:primaryTopic')
            .map((quad) => quad.subject.value)
            .forEach((profileDocumentUrl) => (documents[profileDocumentUrl] = documents[profileDocumentUrl] ?? null));
    };
    const loadProfileDocuments = async (): Promise<void> => {
        for (const [url, document] of Object.entries(documents)) {
            if (document !== null) {
                continue;
            }

            try {
                const _document = await fetchSolidDocument(url, options);

                documents[url] = _document;
                store.addQuads(_document.getQuads());

                addReferencedDocumentUrls(_document);
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    documents[url] = false;

                    continue;
                }

                throw error;
            }
        }
    };

    addReferencedDocumentUrls(webIdDocument);

    do {
        await loadProfileDocuments();
    } while (Object.values(documents).some((document) => document === null));

    return {
        store,
        cloaked: Object.values(documents).some((document) => document === false),
        writableProfileUrl: webIdDocument.isUserWritable()
            ? webIdDocument.url
            : (Object.values(documents).find(
                (document): document is SolidDocument => !!document && document.isUserWritable(),
            )?.url ?? null),
    };
}

async function fetchUserProfile(webId: string, options: FetchUserProfileOptions = {}): Promise<SolidUserProfile> {
    const requestOptions: FetchSolidDocumentOptions = {
        fetch: options.fetch,

        // Needed for CSS v7.1.3.
        // See https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1972
        cache: 'no-store',
    };

    const documentUrl = urlRoute(webId);
    const document = await fetchSolidDocument(documentUrl, requestOptions);

    if (!document.isPersonalProfile() && !document.contains(webId, 'solid:oidcIssuer')) {
        throw new Error(`${webId} is not a valid webId.`);
    }

    const { store, writableProfileUrl, cloaked } = await fetchExtendedUserProfile(document, options);
    const storageUrls = store.statements(webId, 'pim:storage').map((storage) => storage.object.value);
    const publicTypeIndex = store.statement(webId, 'solid:publicTypeIndex');
    const privateTypeIndex = store.statement(webId, 'solid:privateTypeIndex');

    let parentUrl = urlParentDirectory(documentUrl);
    while (parentUrl && storageUrls.length === 0) {
        const parentDocument = await silenced(fetchSolidDocument(parentUrl, requestOptions));

        if (parentDocument?.isStorage()) {
            storageUrls.push(parentUrl);

            break;
        }

        parentUrl = urlParentDirectory(parentUrl);
    }

    if (storageUrls.length === 0) {
        throw new Error(`Could not find any storage for ${webId}.`);
    }

    await options.onLoaded?.(store);

    return {
        webId,
        cloaked,
        writableProfileUrl,
        storageUrls: arrayUnique(storageUrls) as [string, ...string[]],
        ...objectWithoutEmpty({
            name: store.statement(webId, 'vcard:fn')?.object.value ?? store.statement(webId, 'foaf:name')?.object.value,
            avatarUrl:
                store.statement(webId, 'vcard:hasPhoto')?.object.value ??
                store.statement(webId, 'foaf:img')?.object.value,
            oidcIssuerUrl: store.statement(webId, 'solid:oidcIssuer')?.object.value,
            publicTypeIndexUrl: publicTypeIndex?.object.value,
            privateTypeIndexUrl: privateTypeIndex?.object.value,
        }),
    };
}

export interface FetchUserProfileOptions {
    fetch?: Fetch;
    onLoaded?(store: SolidStore): Promise<unknown> | unknown;
}

export interface FetchLoginUserProfileOptions extends FetchUserProfileOptions {
    required?: boolean;
}

export async function fetchLoginUserProfile(
    loginUrl: string,
    options: FetchLoginUserProfileOptions = {},
): Promise<SolidUserProfile | null> {
    if (options.required) {
        return fetchUserProfile(loginUrl, options);
    }

    const fetchProfile = silenced((url) => fetchUserProfile(url, options));

    return (
        (await fetchProfile(loginUrl)) ??
        (await fetchProfile(loginUrl.replace(/\/$/, '').concat('/profile/card#me'))) ??
        (await fetchProfile(urlRoot(loginUrl).concat('/profile/card#me')))
    );
}
