import Unauthorized from '@noeldemartin/solid-utils/errors/Unauthorized';
import UnsupportedAuthorizationProtocol from '@noeldemartin/solid-utils/errors/UnsupportedAuthorizationProtocol';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { describe, expect, it } from 'vite-plus/test';

import { fetchSolidDocumentACR } from './acp';

describe('ACP helpers', () => {
    it('fetches ACRs', async () => {
        // Arrange
        const containerUrl = 'https://example.com/alice/logbook/';
        const acrUrl = `${containerUrl}.acr`;

        FakeServer.respondOnce(containerUrl, FakeResponse.success(undefined, { Link: '<.acr>; rel="acl"' }));
        FakeServer.respondOnce(
            acrUrl,
            FakeResponse.success('<#logbook> a <http://www.w3.org/ns/solid/acp#AccessControlResource> .', {
                Link: '<http://www.w3.org/ns/solid/acp#AccessControlResource>;rel="type"',
            }),
        );

        // Act
        const acr = await fetchSolidDocumentACR(containerUrl, { fetch: FakeServer.fetch });

        // Assert
        expect(acr.url).toEqual(acrUrl);
        expect(acr.document?.getQuads()).toHaveLength(1);
    });

    it('returns null documents when ACRs do not exist', async () => {
        // Arrange
        const containerUrl = 'https://example.com/alice/logbook/';

        FakeServer.respondOnce(containerUrl, FakeResponse.success(undefined, { Link: '<.acr>; rel="acl"' }));
        FakeServer.respondOnce(`${containerUrl}.acr`, FakeResponse.notFound());

        // Act
        const acr = await fetchSolidDocumentACR(containerUrl, { fetch: FakeServer.fetch });

        // Assert
        expect(acr.url).toEqual(`${containerUrl}.acr`);
        expect(acr.document).toBeNull();
    });

    it('fails reading ACRs without control access', async () => {
        // Arrange
        const containerUrl = 'https://example.com/alice/logbook/';

        FakeServer.respondOnce(containerUrl, FakeResponse.success(undefined, { Link: '<.acr>;rel="acl"' }));
        FakeServer.respondOnce(`${containerUrl}.acr`, new Response(null, { status: 403 }));

        // Act
        const promisedACR = fetchSolidDocumentACR(containerUrl, { fetch: FakeServer.fetch });

        // Assert
        await expect(promisedACR).rejects.toBeInstanceOf(Unauthorized);
    });

    it('fails with WAC resources', async () => {
        // Arrange
        const containerUrl = 'https://example.com/alice/logbook/';

        FakeServer.respondOnce(containerUrl, FakeResponse.success(undefined, { Link: '<.acl>; rel="acl"' }));
        FakeServer.respondOnce(`${containerUrl}.acl`, FakeResponse.success('<#owner> a <#Authorization> .'));

        // Act
        const promisedACR = fetchSolidDocumentACR(containerUrl, { fetch: FakeServer.fetch });

        // Assert
        await expect(promisedACR).rejects.toBeInstanceOf(UnsupportedAuthorizationProtocol);
    });
});
