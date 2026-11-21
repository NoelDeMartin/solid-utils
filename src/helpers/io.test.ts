import NotFound from '@noeldemartin/solid-utils/errors/NotFound';
import Unauthorized from '@noeldemartin/solid-utils/errors/Unauthorized';
import UnsuccessfulNetworkRequest from '@noeldemartin/solid-utils/errors/UnsuccessfulNetworkRequest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { describe, expect, it } from 'vite-plus/test';

import {
    createSolidContainer,
    createSolidDocumentInContainer,
    fetchSolidFile,
    uploadSolidFile,
    uploadSolidFileInContainer,
} from './io';

describe('IO helpers', () => {
    it('creates containers with Content-Type and Link headers', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/cookbook/';

        FakeServer.respondOnce(containerUrl, FakeResponse.created());
        FakeServer.respondOnce(`${containerUrl}.meta`, FakeResponse.success());

        // Act
        await createSolidContainer(containerUrl, '<> <http://www.w3.org/2000/01/rdf-schema#label> "Cookbook" .', {
            fetch: FakeServer.fetch,
        });

        // Assert
        const request = FakeServer.getRequest('PUT', containerUrl);

        expect(request?.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'text/turtle',
                'If-None-Match': '*',
                Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
            }),
        );
    });

    it('creates documents in containers', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/inbox/';
        const proposedUrl = `${containerUrl}proposed`;

        FakeServer.respondOnce(containerUrl, FakeResponse.created('', { Location: '/inbox/assigned' }));

        // Act
        const document = await createSolidDocumentInContainer(
            containerUrl,
            `<${proposedUrl}#it> a <https://www.w3.org/ns/activitystreams#Offer> ; <https://example.com/source> <${proposedUrl}> .`,
            { fetch: FakeServer.fetch, slug: 'my proposal', base: proposedUrl },
        );

        // Assert
        const request = FakeServer.getRequest('POST', containerUrl);

        expect(document.url).toEqual(`${containerUrl}assigned`);
        expect(
            document.contains(`${containerUrl}assigned#it`, 'rdf:type', 'https://www.w3.org/ns/activitystreams#Offer'),
        ).toBe(true);
        expect(request?.headers).toEqual(
            expect.objectContaining({ 'Content-Type': 'text/turtle', Slug: 'my%20proposal' }),
        );
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

    it('uploads files', async () => {
        // Arrange
        const fileUrl = 'https://bob.example/images/001.png';
        const file = new Blob(['png-bytes'], { type: 'image/png' });

        FakeServer.respondOnce(fileUrl, FakeResponse.created());

        // Act
        await uploadSolidFile(fileUrl, file, { fetch: FakeServer.fetch, overwrite: false });

        // Assert
        const request = FakeServer.getRequest('PUT', fileUrl);

        expect(request?.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'image/png',
                'If-None-Match': '*',
            }),
        );
    });

    it('fails uploading files when overwrite is false and resource exists', async () => {
        // Arrange
        const fileUrl = 'https://bob.example/images/001.png';
        const file = new Blob(['png-bytes'], { type: 'image/png' });

        FakeServer.respondOnce(fileUrl, new FakeResponse('', {}, 412));

        // Act
        const upload = uploadSolidFile(fileUrl, file, { fetch: FakeServer.fetch, overwrite: false });

        // Assert
        await expect(upload).rejects.toBeInstanceOf(UnsuccessfulNetworkRequest);
    });

    it('uploads files in containers', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/images/';
        const file = new File(['png-bytes'], 'ワンピース.png', { type: 'image/png' });

        FakeServer.respondOnce(containerUrl, FakeResponse.created('', { Location: '/images/001.png' }));

        // Act
        const response = await uploadSolidFileInContainer(containerUrl, file, { fetch: FakeServer.fetch });

        // Assert
        const request = FakeServer.getRequest('POST', containerUrl);

        expect(response.url).toEqual(`${containerUrl}001.png`);
        expect(request?.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'image/png',
                Slug: encodeURIComponent('ワンピース.png'),
            }),
        );
    });

    it('fails uploading files in containers without a location', async () => {
        // Arrange
        const containerUrl = 'https://bob.example/images/';
        const file = new File(['png-bytes'], '001.png', { type: 'image/png' });

        FakeServer.respondOnce(containerUrl, FakeResponse.created());

        // Act
        const upload = uploadSolidFileInContainer(containerUrl, file, { fetch: FakeServer.fetch });

        // Assert
        await expect(upload).rejects.toBeInstanceOf(UnsuccessfulNetworkRequest);
    });

    it('fetches files and handles errors', async () => {
        // Arrange
        const fileUrl = 'https://bob.example/images/001.png';

        FakeServer.respondOnce(fileUrl, new Response(new Blob(['png-bytes'], { type: 'image/png' })));
        FakeServer.respondOnce(fileUrl, FakeResponse.notFound());
        FakeServer.respondOnce(fileUrl, new FakeResponse('', {}, 401));

        // Act & Assert
        const blob = await fetchSolidFile(fileUrl, { fetch: FakeServer.fetch });
        expect(await blob.text()).toEqual('png-bytes');

        await expect(fetchSolidFile(fileUrl, { fetch: FakeServer.fetch })).rejects.toBeInstanceOf(NotFound);
        await expect(fetchSolidFile(fileUrl, { fetch: FakeServer.fetch })).rejects.toBeInstanceOf(Unauthorized);
    });
});
