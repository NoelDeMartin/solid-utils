import NetworkRequestFailed from '@noeldemartin/solid-utils/errors/NetworkRequestFailed';
import NotFound from '@noeldemartin/solid-utils/errors/NotFound';
import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { describe, expect, it } from 'vite-plus/test';

import { canReadSolidDocument, fetchSolidDocumentAuthorizationUrl } from './authorization';

describe('Authorization helpers', () => {
    it('finds authorization resources', async () => {
        // Arrange
        const documentUrl = 'https://example.com/alice/logbook/index';

        FakeServer.respondOnce(documentUrl, FakeResponse.success(undefined, { Link: '<index.acr>; rel="acl"' }));
        FakeServer.respondOnce(documentUrl, FakeResponse.success());

        // Act
        const url = await fetchSolidDocumentAuthorizationUrl(documentUrl, { fetch: FakeServer.fetch });
        const missing = fetchSolidDocumentAuthorizationUrl(documentUrl, { fetch: FakeServer.fetch });

        // Assert
        expect(url).toEqual('https://example.com/alice/logbook/index.acr');
        await expect(missing).rejects.toThrow(
            "Could not find ACL Resource for 'https://example.com/alice/logbook/index'",
        );
    });

    it('checks read access with requests', async () => {
        // Arrange
        const url = 'https://example.com/alice/logbook/';

        FakeServer.respondOnce(url, FakeResponse.success());
        FakeServer.respondOnce(url, new Response(null, { status: 401 }));
        FakeServer.respondOnce(url, new Response(null, { status: 403 }));
        FakeServer.respondOnce(url, FakeResponse.notFound());
        FakeServer.respondOnce(url, FakeResponse.internalServerError());

        // Act
        const results = [
            await canReadSolidDocument(url, { fetch: FakeServer.fetch }),
            await canReadSolidDocument(url, { fetch: FakeServer.fetch }),
            await canReadSolidDocument(url, { fetch: FakeServer.fetch }),
        ];
        const notFound = canReadSolidDocument(url, { fetch: FakeServer.fetch });
        const serverError = canReadSolidDocument(url, { fetch: FakeServer.fetch });

        // Assert
        expect(results).toEqual([true, false, false]);
        await expect(notFound).rejects.toBeInstanceOf(NotFound);
        await expect(serverError).rejects.toBeInstanceOf(NetworkRequestFailed);
        await expect(serverError).rejects.toHaveProperty('cause', expect.any(UnsuccessfulNetworkRequest));
        expect(FakeServer.getRequests(url).map(({ method }) => method)).toEqual(Array(5).fill('HEAD'));
    });
});
