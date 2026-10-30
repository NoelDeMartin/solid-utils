import {
    arrayUnique,
    fail,
    objectWithoutEmpty,
    silenced,
    urlClean,
    urlParentDirectory,
    urlResolve,
    urlRoot,
    urlRoute,
} from '@noeldemartin/utils';

import Unauthorized from '../errors/Unauthorized';
import type SolidDocument from '../models/SolidDocument';
import SolidStore from '../models/SolidStore';
import { fetchSolidDocument } from './io';
import type { Fetch, FetchSolidDocumentOptions } from './io';

export interface SolidUserProfileBase {
    webId: string;
    writableProfileUrl: string | null;
    cloakedDocumentUrls: string[];
    name?: string;
    avatarUrl?: string;
    oidcIssuerUrl?: string;
    preferencesFileUrl?: string;
    publicTypeIndexUrl?: string;
    privateTypeIndexUrl?: string;
}

export interface CompleteSolidUserProfile extends SolidUserProfileBase {
    shallow: false;
    storageUrls: [string, ...string[]];
}

export interface ShallowSolidUserProfile extends SolidUserProfileBase {
    shallow: true;
    storageUrls: string[];
}

export type SolidUserProfile = CompleteSolidUserProfile | ShallowSolidUserProfile;

async function fetchExtendedUserProfile(
    webId: string,
    webIdDocument: SolidDocument,
    maxDepth: number,
    options?: FetchSolidDocumentOptions,
): Promise<{
    store: SolidStore;
    cloakedDocumentUrls: string[];
    writableProfileUrl: string | null;
    preferencesFileUrl?: string;
}> {
    const store = new SolidStore(webIdDocument.getQuads());
    const documents: Record<string, SolidDocument | 'unauthorized' | 'failed'> = {
        [webIdDocument.url]: webIdDocument,
    };
    const preferencesFileUrls: string[] = [];
    const profileDocumentUrls = new Set([webIdDocument.url]);
    const getLinkedDocumentUrls = (document: SolidDocument): string[] => {
        const getObjectUrls = (predicate: string) =>
            document
                .statements(webId, predicate)
                .filter((quad) => quad.object.termType === 'NamedNode')
                .map((quad) => urlClean(quad.object.value, { fragment: false }));

        const reversePrimaryTopicUrls = document
            .statements(undefined, 'foaf:primaryTopic', webId)
            .filter((quad) => quad.subject.termType === 'NamedNode')
            .map((quad) => urlClean(quad.subject.value, { fragment: false }));
        const isPrimaryTopicOfUrls = getObjectUrls('foaf:isPrimaryTopicOf');
        const seeAlsoUrls = getObjectUrls('rdfs:seeAlso');
        const documentPreferencesFileUrls = getObjectUrls('pim:preferencesFile');

        isPrimaryTopicOfUrls.forEach((url) => profileDocumentUrls.add(url));
        reversePrimaryTopicUrls.forEach((url) => profileDocumentUrls.add(url));
        preferencesFileUrls.push(...documentPreferencesFileUrls);

        return [...seeAlsoUrls, ...isPrimaryTopicOfUrls, ...documentPreferencesFileUrls, ...reversePrimaryTopicUrls];
    };

    let pendingUrls = getLinkedDocumentUrls(webIdDocument);

    for (let depth = 1; depth <= maxDepth && pendingUrls.length > 0; depth++) {
        const linkedUrls: string[] = [];

        for (const url of arrayUnique(pendingUrls)) {
            if (url in documents) {
                continue;
            }

            try {
                const document = await fetchSolidDocument(url, options);

                documents[url] = document;
                store.addQuads(document.getQuads());
                linkedUrls.push(...getLinkedDocumentUrls(document));
            } catch (error) {
                if (error instanceof Unauthorized) {
                    documents[url] = 'unauthorized';

                    continue;
                }

                // oxlint-disable-next-line no-console
                console.warn(`Could not read profile document at ${url}`, error);

                documents[url] = 'failed';
            }
        }

        pendingUrls = linkedUrls;
    }

    return {
        store,
        preferencesFileUrl: preferencesFileUrls[0],
        cloakedDocumentUrls: Object.entries(documents)
            .filter(([_, document]) => document === 'unauthorized')
            .map(([url]) => url),
        writableProfileUrl: webIdDocument.isUserWritable()
            ? webIdDocument.url
            : (Object.values(documents).find(
                  (document): document is SolidDocument =>
                      typeof document === 'object' &&
                      profileDocumentUrls.has(document.url) &&
                      document.isUserWritable(),
              )?.url ?? null),
    };
}

async function fetchUserProfile(webId: string, options: FetchUserProfileOptions = {}): Promise<SolidUserProfile> {
    const shallow = !!options.shallow;
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

    const { store, writableProfileUrl, cloakedDocumentUrls, preferencesFileUrl } = await fetchExtendedUserProfile(
        webId,
        document,
        shallow ? 0 : (options.maxDepth ?? 3),
        requestOptions,
    );
    const storageUrls = store
        .statements(webId, 'pim:storage')
        .map((storage) => urlResolve(documentUrl, storage.object.value));
    const publicTypeIndex = store.statement(webId, 'solid:publicTypeIndex');
    const privateTypeIndex = store.statement(webId, 'solid:privateTypeIndex');

    if (!shallow && storageUrls.length === 0) {
        const storageUrl = await discoverStorageUrl(urlParentDirectory(documentUrl), requestOptions);

        storageUrls.push(storageUrl ?? fail(`Could not find any storage for ${webId}.`));
    }

    await options.onLoaded?.(store);

    return {
        webId,
        shallow,
        cloakedDocumentUrls,
        writableProfileUrl,
        storageUrls: arrayUnique(storageUrls),
        ...objectWithoutEmpty({
            preferencesFileUrl,
            name: store.statement(webId, 'vcard:fn')?.object.value ?? store.statement(webId, 'foaf:name')?.object.value,
            avatarUrl:
                store.statement(webId, 'vcard:hasPhoto')?.object.value ??
                store.statement(webId, 'foaf:img')?.object.value,
            oidcIssuerUrl: document.statement(webId, 'solid:oidcIssuer')?.object.value,
            publicTypeIndexUrl: publicTypeIndex?.object.value,
            privateTypeIndexUrl: privateTypeIndex?.object.value,
        }),
    } as SolidUserProfile;
}

async function discoverStorageUrl(
    parentUrl: string | null,
    requestOptions: FetchSolidDocumentOptions,
): Promise<string | null> {
    if (!parentUrl) {
        return null;
    }

    const parentDocument = await silenced(fetchSolidDocument(parentUrl, requestOptions));

    if (parentDocument?.isStorage()) {
        return parentUrl;
    }

    return discoverStorageUrl(urlParentDirectory(parentUrl), requestOptions);
}

export interface FetchUserProfileOptions {
    fetch?: Fetch;
    shallow?: boolean;
    maxDepth?: number;
    onLoaded?(store: SolidStore): unknown;
}

export interface FetchLoginUserProfileOptions extends FetchUserProfileOptions {
    required?: boolean;
}

export type FetchLoginUserProfileOptionsShallow = { shallow: true };
export type FetchLoginUserProfileOptionsNotShallow = { shallow?: false };
export type FetchLoginUserProfileOptionsRequired = { required: true };

export async function fetchLoginUserProfile(
    loginUrl: string,
    options: FetchLoginUserProfileOptions & FetchLoginUserProfileOptionsRequired & FetchLoginUserProfileOptionsShallow,
): Promise<ShallowSolidUserProfile>;
export async function fetchLoginUserProfile(
    loginUrl: string,
    options: FetchLoginUserProfileOptions &
        FetchLoginUserProfileOptionsRequired &
        FetchLoginUserProfileOptionsNotShallow,
): Promise<CompleteSolidUserProfile>;
export async function fetchLoginUserProfile(
    loginUrl: string,
    options: FetchLoginUserProfileOptions & FetchLoginUserProfileOptionsRequired,
): Promise<SolidUserProfile>;
export async function fetchLoginUserProfile(
    loginUrl: string,
    options: FetchLoginUserProfileOptions & FetchLoginUserProfileOptionsShallow,
): Promise<ShallowSolidUserProfile | null>;
export async function fetchLoginUserProfile(
    loginUrl: string,
    options?: FetchLoginUserProfileOptions & FetchLoginUserProfileOptionsNotShallow,
): Promise<CompleteSolidUserProfile | null>;
export async function fetchLoginUserProfile(
    loginUrl: string,
    options?: FetchLoginUserProfileOptions,
): Promise<SolidUserProfile | null>;
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
