import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { describe, expect, it } from 'vite-plus/test';

import { createSolidDocumentInContainer } from './io';

describe('IO helpers', () => {
    it('creates documents in containers', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/inbox/';
        const proposedUrl = `${containerUrl}proposed`;

        FakeServer.respondOnce(containerUrl, FakeResponse.created('', { Location: '/inbox/assigned' }));

        // Act
        const document = await createSolidDocumentInContainer(
            containerUrl,
            `<${proposedUrl}#it> a <https://www.w3.org/ns/activitystreams#Offer> ; <https://example.com/source> <${proposedUrl}> .`,
            { fetch: FakeServer.fetch, slug: 'proposed', base: proposedUrl },
        );

        // Assert
        const request = FakeServer.getRequest('POST', containerUrl);

        expect(document.url).toEqual(`${containerUrl}assigned`);
        expect(
            document.contains(`${containerUrl}assigned#it`, 'rdf:type', 'https://www.w3.org/ns/activitystreams#Offer'),
        ).toBe(true);
        expect(request?.headers).toEqual(expect.objectContaining({ 'Content-Type': 'text/turtle', Slug: 'proposed' }));
        expect(request?.body).toEqualTurtle(
            '<#it> a <https://www.w3.org/ns/activitystreams#Offer> ; <https://example.com/source> <> .',
        );
    });

    it('fails creating documents in containers without a location', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/inbox/';

        FakeServer.respondOnce(containerUrl, FakeResponse.created());

        // Act
        const creation = createSolidDocumentInContainer(containerUrl, '<> a <https://example.com/Thing> .', {
            fetch: FakeServer.fetch,
        });

        // Assert
        await expect(creation).rejects.toBeInstanceOf(UnsuccessfulNetworkRequest);
    });
});
