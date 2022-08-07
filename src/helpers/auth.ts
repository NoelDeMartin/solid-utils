import { objectWithoutEmpty, silenced, urlParentDirectory, urlRoot, urlRoute } from '@noeldemartin/utils';

import SolidStore from '../models/SolidStore';
import UnauthorizedError from '../errors/UnauthorizedError';
import type SolidDocument from '../models/SolidDocument';

import { fetchSolidDocument } from './io';
import type { Fetch } from './io';

export interface SolidUserProfile {
    webId: string;
    storageUrls: string[];
    cloaked: boolean;
    name?: string;
    avatarUrl?: string;
    oidcIssuerUrl?: string;
    publicTypeIndexUrl?: string;
    privateTypeIndexUrl?: string;
}

async function fetchExtendedUserProfile(document: SolidDocument, fetch?: Fetch): Promise<{
    store: SolidStore;
    cloaked: boolean;
}> {
    let cloaked = false;
    const store = new SolidStore(document.getQuads());
    const profileDocumentUrls = new Set([document.url]);
    const loadedDocumentUrls = new Set([document.url]);
    const addReferencedDocumentUrls = (document: SolidDocument) => document
        .statements(undefined, 'rdfs:seeAlso')
        .map(quad => quad.object.value)
        .forEach(profileDocumentUrl => profileDocumentUrls.add(profileDocumentUrl));
    const loadProfileDocuments = async (): Promise<void> => {
        for (const url of [...profileDocumentUrls]) {
            if (loadedDocumentUrls.has(url)) {
                continue;
            }

            try {
                const document = await fetchSolidDocument(url, fetch);

                loadedDocumentUrls.add(document.url);
                store.addQuads(document.getQuads());

                addReferencedDocumentUrls(document);
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    cloaked = true;
                }

                // Silence error
            }
        }
    };

    addReferencedDocumentUrls(document);

    do {
        await loadProfileDocuments();
    } while (loadedDocumentUrls.size < loadedDocumentUrls.size);

    return {
        store,
        cloaked,
    };
}

async function fetchUserProfile(webId: string, fetch?: Fetch): Promise<SolidUserProfile> {
    const documentUrl = urlRoute(webId);
    const document = await fetchSolidDocument(documentUrl, fetch);

    if (!document.isPersonalProfile() && !document.contains(webId, 'solid:oidcIssuer'))
        throw new Error(`${webId} is not a valid webId.`);

    const { store, cloaked } = await fetchExtendedUserProfile(document, fetch);
    const storageUrls = store.statements(webId, 'pim:storage').map(storage => storage.object.value);
    const publicTypeIndex = store.statement(webId, 'solid:publicTypeIndex');
    const privateTypeIndex = store.statement(webId, 'solid:privateTypeIndex');

    let parentUrl = urlParentDirectory(documentUrl);
    while (parentUrl && storageUrls.length === 0) {
        const parentDocument = await silenced(fetchSolidDocument(parentUrl, fetch));

        if (parentDocument?.isStorage()) {
            storageUrls.push(parentUrl);

            break;
        }

        parentUrl = urlParentDirectory(parentUrl);
    }

    return objectWithoutEmpty({
        webId,
        storageUrls,
        cloaked,
        name:
            store.statement(webId, 'vcard:fn')?.object.value ??
            store.statement(webId, 'foaf:name')?.object.value,
        avatarUrl:
            store.statement(webId, 'vcard:hasPhoto')?.object.value ??
            store.statement(webId, 'foaf:img')?.object.value,
        oidcIssuerUrl: store.statement(webId, 'solid:oidcIssuer')?.object.value,
        publicTypeIndexUrl: publicTypeIndex?.object.value,
        privateTypeIndexUrl: privateTypeIndex?.object.value,
    });
}

export async function fetchLoginUserProfile(loginUrl: string, fetch?: Fetch): Promise<SolidUserProfile | null> {
    const fetchProfile = silenced(url => fetchUserProfile(url, fetch));

    return await fetchProfile(loginUrl)
        ?? await fetchProfile(loginUrl.replace(/\/$/, '').concat('/profile/card#me'))
        ?? await fetchProfile(urlRoot(loginUrl).concat('/profile/card#me'));
}
