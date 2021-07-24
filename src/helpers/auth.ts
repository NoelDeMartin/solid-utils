import { objectWithoutEmpty, silenced, urlParentDirectory, urlRoot, urlRoute } from '@noeldemartin/utils';

import { fetchSolidDocument } from './io';
import type { Fetch } from './io';

export interface SolidUserProfile {
    webId: string;
    storageUrls: string[];
    name?: string;
    avatarUrl?: string;
    oidcIssuerUrl?: string;
    publicTypeIndexUrl?: string;
    privateTypeIndexUrl?: string;
}

async function fetchUserProfile(webId: string, fetch?: Fetch): Promise<SolidUserProfile> {
    const documentUrl = urlRoute(webId);
    const document = await fetchSolidDocument(documentUrl, fetch);

    if (!document.isPersonalProfile())
        throw new Error(`Document at ${documentUrl} is not a profile.`);

    const storageUrls = document.statements(webId, 'pim:storage').map(storage => storage.object.value);
    const publicTypeIndex = document.statement(webId, 'solid:publicTypeIndex');
    const privateTypeIndex = document.statement(webId, 'solid:privateTypeIndex');

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
        name:
            document.statement(webId, 'vcard:fn')?.object.value ??
            document.statement(webId, 'foaf:name')?.object.value,
        avatarUrl:
            document.statement(webId, 'vcard:hasPhoto')?.object.value ??
            document.statement(webId, 'foaf:img')?.object.value,
        oidcIssuerUrl: document.statement(webId, 'solid:oidcIssuer')?.object.value,
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
