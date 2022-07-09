import { objectWithoutEmpty, requireUrlParentDirectory, urlResolve } from '@noeldemartin/utils';

import { fetchSolidDocumentIfFound } from '@/helpers/io';
import type SolidDocument from '@/models/SolidDocument';
import type { Fetch } from '@/helpers/io';

async function fetchACLResourceUrl(resourceUrl: string, fetch: Fetch): Promise<string> {
    fetch = fetch ?? window.fetch.bind(window);

    const resourceHead = await fetch(resourceUrl, { method: 'HEAD' });
    const linkHeader = resourceHead.headers.get('Link') ?? '';
    const url = linkHeader.match(/<([^>]+)>;\s*rel="acl"/)?.[1] ?? null;

    if (!url) {
        throw new Error(`Could not find ACL Resource for '${resourceUrl}'`);
    }

    return urlResolve(requireUrlParentDirectory(resourceUrl), url);
}

async function fetchEffectiveACL(
    resourceUrl: string,
    fetch: Fetch,
    aclResourceUrl?: string | null,
): Promise<SolidDocument> {
    aclResourceUrl = aclResourceUrl ?? await fetchACLResourceUrl(resourceUrl, fetch);

    return await fetchSolidDocumentIfFound(aclResourceUrl ?? '', fetch)
        ?? await fetchEffectiveACL(requireUrlParentDirectory(resourceUrl), fetch);
}

export async function fetchSolidDocumentACL(documentUrl: string, fetch: Fetch): Promise<{
    url: string;
    effectiveUrl: string;
    document: SolidDocument;
}> {
    const url = await fetchACLResourceUrl(documentUrl, fetch);
    const document = await fetchEffectiveACL(documentUrl, fetch, url);

    return objectWithoutEmpty({
        url,
        effectiveUrl: document.url,
        document,
    });
}
