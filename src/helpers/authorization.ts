import NetworkRequestFailed from '@noeldemartin/solid-utils/errors/NetworkRequestFailed';
import NotFound from '@noeldemartin/solid-utils/errors/NotFound';
import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { globalFetch } from '@noeldemartin/solid-utils/helpers/io';
import type { FetchOptions } from '@noeldemartin/solid-utils/helpers/io';
import { requireUrlParentDirectory, urlResolve } from '@noeldemartin/utils';

export async function fetchSolidDocumentAuthorizationUrl(
    documentUrl: string,
    options: FetchOptions = {},
): Promise<string> {
    const fetch = options.fetch ?? globalFetch;
    const documentHead = await fetch(documentUrl, { method: 'HEAD' });
    const linkHeader = documentHead.headers.get('Link') ?? '';
    const url = linkHeader.match(/<([^>]+)>;\s*rel="acl"/)?.[1] ?? null;

    if (!url) {
        throw new Error(`Could not find ACL Resource for '${documentUrl}'`);
    }

    const directoryUrl = documentUrl.endsWith('/') ? documentUrl : requireUrlParentDirectory(documentUrl);

    return urlResolve(directoryUrl, url);
}

export async function canReadSolidDocument(url: string, options: FetchOptions = {}): Promise<boolean> {
    const fetch = options.fetch ?? globalFetch;
    const response = await fetch(url, { method: 'HEAD' }).catch((error: unknown) => {
        throw new NetworkRequestFailed(url, { cause: error });
    });

    if ([401, 403].includes(response.status)) {
        return false;
    }

    if (response.status === 404) {
        throw new NotFound(url);
    }

    if (Math.floor(response.status / 100) !== 2) {
        throw new NetworkRequestFailed(url, {
            cause: new UnsuccessfulNetworkRequest(`Error checking access to ${url}`, response),
        });
    }

    return true;
}
