import CloakedPreferencesFile from '@noeldemartin/solid-utils/errors/CloakedPreferencesFile';
import type { CompleteSolidUserProfile } from '@noeldemartin/solid-utils/helpers/auth';
import { installVitestSolidMatchers } from '@noeldemartin/solid-utils/vitest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { beforeAll, describe, expect, it } from 'vite-plus/test';

import { findOrCreatePreferencesFile } from './interop';

describe('Interop helpers', () => {
    const storageUrl = 'https://alice.example.com/';
    const webId = `${storageUrl}profile/card#me`;
    const profileUrl = `${storageUrl}profile/card`;

    function user(attributes: Partial<CompleteSolidUserProfile> = {}): CompleteSolidUserProfile {
        return {
            webId,
            shallow: false,
            storageUrls: [storageUrl],
            writableProfileUrl: profileUrl,
            cloakedDocumentUrls: [],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            ...attributes,
        };
    }

    function respondTo(method: 'PUT' | 'PATCH', url: string, response: Response = FakeResponse.success()): void {
        FakeServer.respond(url, { method, response });
    }

    beforeAll(() => installVitestSolidMatchers());

    it('creates preferences files', async () => {
        // Arrange
        const preferencesFileUrl = `${storageUrl}settings/preferences`;
        const profile = user();

        respondTo('PUT', preferencesFileUrl, FakeResponse.created());
        respondTo('PATCH', profileUrl);

        // Act
        const url = await findOrCreatePreferencesFile(profile, FakeServer.fetch);

        // Assert
        expect(url).toEqual(preferencesFileUrl);

        expect(FakeServer.getRequest('PUT', preferencesFileUrl)?.body).toEqualTurtle(`
            <> a <http://www.w3.org/ns/pim/space#ConfigurationFile> .
        `);
        expect(FakeServer.getRequest('PATCH', profileUrl)?.body).toEqualSparql(`
            INSERT DATA { <#me> <http://www.w3.org/ns/pim/space#preferencesFile> <${preferencesFileUrl}> . }
        `);
    });

    it('finds existing preferences files', async () => {
        // Arrange
        const preferencesFileUrl = `${storageUrl}settings/prefs.ttl`;

        // Act
        const url = await findOrCreatePreferencesFile(user({ preferencesFileUrl }), FakeServer.fetch);

        // Assert
        expect(url).toEqual(preferencesFileUrl);
        expect(FakeServer.getRequests()).toHaveLength(0);
    });

    it('mints a new preferences file url when the default one is taken', async () => {
        // Arrange
        const takenUrl = `${storageUrl}settings/preferences`;
        const profile = user();

        FakeServer.respond(takenUrl, { method: 'GET', response: FakeResponse.success('<> a <#Something> .') });
        FakeServer.respondWith('*', (request) =>
            request.method === 'GET' ? FakeResponse.notFound() : FakeResponse.success(),
        );

        // Act
        const url = await findOrCreatePreferencesFile(profile, FakeServer.fetch);

        // Assert
        expect(url).toMatch(
            /^https:\/\/alice\.example\.com\/settings\/preferences-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(FakeServer.getRequests('PUT', takenUrl)).toHaveLength(0);
        expect(FakeServer.getRequest('PUT', url)).not.toBeNull();
    });

    it('fails creating preferences files when profile documents in the POD are cloaked', async () => {
        // Arrange
        const profile = user({ cloakedDocumentUrls: [`${storageUrl}profile/extended`] });

        // Act
        const promisedUrl = findOrCreatePreferencesFile(profile, FakeServer.fetch);

        // Assert
        await expect(promisedUrl).rejects.toBeInstanceOf(CloakedPreferencesFile);
        await expect(promisedUrl).rejects.toThrow(
            `Can't create preferences file because the document at ${storageUrl}profile/extended could not be read`,
        );
        expect(FakeServer.getRequests()).toHaveLength(0);
    });

    it('creates preferences files when cloaked documents are outside the POD', async () => {
        // Arrange
        const preferencesFileUrl = `${storageUrl}settings/preferences`;
        const profile = user({ cloakedDocumentUrls: ['https://bob.example.com/profile/card'] });

        respondTo('PUT', preferencesFileUrl, FakeResponse.created());
        respondTo('PATCH', profileUrl);

        // Act
        const url = await findOrCreatePreferencesFile(profile, FakeServer.fetch);

        // Assert
        expect(url).toEqual(preferencesFileUrl);
    });
});
