import { silenced, urlRoot } from '@noeldemartin/utils';

import { fetchSolidDocument } from './io';
import type { Fetch } from './io';

export interface SolidUserProfile {
    webId: string;
    storageUrls: string[];
    privateTypeIndexUrl: string;
    name?: string;
    avatarUrl?: string;
    oidcIssuerUrl?: string;
}

async function fetchUserProfile(webId: string, fetch?: Fetch): Promise<SolidUserProfile> {
    const store = await fetchSolidDocument(webId, fetch);
    const storages = store.statements(webId, 'pim:storage');
    const privateTypeIndex = store.statement(webId, 'solid:privateTypeIndex');

    if (storages.length === 0)
        throw new Error('Couldn\'t find a storage in profile');

    if (!privateTypeIndex)
        throw new Error('Couldn\'t find a private type index in the profile');

    return {
        webId,
        storageUrls: storages.map(storage => storage.object.value),
        privateTypeIndexUrl: privateTypeIndex.object.value,
        name:
            store.statement(webId, 'vcard:fn')?.object.value ??
            store.statement(webId, 'foaf:name')?.object.value,
        avatarUrl:
            store.statement(webId, 'vcard:hasPhoto')?.object.value ??
            store.statement(webId, 'foaf:img')?.object.value,
        oidcIssuerUrl: store.statement(webId, 'solid:oidcIssuer')?.object.value,
    };
}

export async function fetchLoginUserProfile(loginUrl: string, fetch?: Fetch): Promise<SolidUserProfile | null> {
    const fetchProfile = silenced(url => fetchUserProfile(url, fetch));

    return await fetchProfile(loginUrl)
        ?? await fetchProfile(loginUrl.replace(/\/$/, '').concat('/profile/card#me'))
        ?? await fetchProfile(urlRoot(loginUrl).concat('/profile/card#me'));
}
