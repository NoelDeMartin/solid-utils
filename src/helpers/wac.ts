import UnsupportedAuthorizationProtocol from '@noeldemartin/solid-utils/errors/UnsupportedAuthorizationProtocol';
import { fetchSolidDocumentAuthorizationUrl } from '@noeldemartin/solid-utils/helpers/authorization';
import { fetchSolidDocumentIfFound } from '@noeldemartin/solid-utils/helpers/io';
import type { FetchOptions } from '@noeldemartin/solid-utils/helpers/io';
import type SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';
import { objectWithoutEmpty, requireUrlParentDirectory } from '@noeldemartin/utils';

interface FetchEffectiveACLOptions extends FetchOptions {
    aclUrl?: string;
}

async function fetchEffectiveACL(documentUrl: string, options: FetchEffectiveACLOptions): Promise<SolidDocument> {
    const aclUrl = options.aclUrl ?? (await fetchSolidDocumentAuthorizationUrl(documentUrl, { fetch: options.fetch }));
    const aclDocument = await fetchSolidDocumentIfFound(aclUrl, { fetch: options.fetch });

    if (!aclDocument) {
        return fetchEffectiveACL(requireUrlParentDirectory(documentUrl), { fetch: options.fetch });
    }

    if (aclDocument.isACPResource()) {
        throw new UnsupportedAuthorizationProtocol(documentUrl, 'ACP');
    }

    return aclDocument;
}

export async function fetchSolidDocumentACL(
    documentUrl: string,
    options: FetchOptions = {},
): Promise<{
    url: string;
    effectiveUrl: string;
    document: SolidDocument;
}> {
    const url = await fetchSolidDocumentAuthorizationUrl(documentUrl, options);
    const document = await fetchEffectiveACL(documentUrl, { fetch: options.fetch, aclUrl: url });

    return objectWithoutEmpty({
        url,
        effectiveUrl: document.url,
        document,
    });
}
