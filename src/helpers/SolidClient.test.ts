import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { describe, expect, it } from 'vite-plus/test';

import SolidClient from './SolidClient';

describe('SolidClient', () => {
    it('merges request headers when uploading files', async () => {
        // Arrange
        const fileUrl = 'https://bob.example/images/001.png';
        const client = new SolidClient({ fetch: FakeServer.fetch, headers: { 'X-Client': 'client' } });

        FakeServer.respondOnce(fileUrl, FakeResponse.success());

        // Act
        await client.uploadFile(fileUrl, new Blob(['png-bytes'], { type: 'image/png' }), {
            headers: { 'If-Unmodified-Since': 'Tue, 17 Nov 2026 07:00:00 GMT' },
        });

        // Assert
        expect(FakeServer.getRequest('PUT', fileUrl)?.headers).toEqual(
            expect.objectContaining({
                'X-Client': 'client',
                'If-Unmodified-Since': 'Tue, 17 Nov 2026 07:00:00 GMT',
            }),
        );
    });

    it('merges request headers when deleting documents', async () => {
        // Arrange
        const fileUrl = 'https://bob.example/images/001.png';
        const client = new SolidClient({ fetch: FakeServer.fetch, headers: { 'X-Client': 'client' } });

        FakeServer.respondOnce(fileUrl, FakeResponse.success());

        // Act
        await client.delete(fileUrl, { headers: { 'If-Unmodified-Since': 'Tue, 17 Nov 2026 07:00:00 GMT' } });

        // Assert
        expect(FakeServer.getRequest('DELETE', fileUrl)?.headers).toEqual({
            'X-Client': 'client',
            'If-Unmodified-Since': 'Tue, 17 Nov 2026 07:00:00 GMT',
        });
    });
});
