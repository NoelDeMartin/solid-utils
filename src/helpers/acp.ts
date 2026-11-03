import UnsupportedAuthorizationProtocol from '@noeldemartin/solid-utils/errors/UnsupportedAuthorizationProtocol';
import { fetchSolidDocumentAuthorizationUrl } from '@noeldemartin/solid-utils/helpers/authorization';
import { fetchSolidDocumentIfFound } from '@noeldemartin/solid-utils/helpers/io';
import type { FetchOptions } from '@noeldemartin/solid-utils/helpers/io';
import type SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';

export async function fetchSolidDocumentACR(
    documentUrl: string,
    options: FetchOptions = {},
): Promise<{ url: string; document: SolidDocument | null }> {
    const url = await fetchSolidDocumentAuthorizationUrl(documentUrl, options);
    const document = await fetchSolidDocumentIfFound(url, { fetch: options.fetch });

    if (document && !document.isACPResource()) {
        throw new UnsupportedAuthorizationProtocol(documentUrl, 'WAC');
    }

    return { url, document };
}
