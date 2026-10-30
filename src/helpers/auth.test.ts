import { MalformedSolidDocument } from '@noeldemartin/solid-utils/errors';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';

import type SolidStore from '../models/SolidStore';
import { fetchLoginUserProfile } from './auth';
import type { SolidUserProfile, ShallowSolidUserProfile, CompleteSolidUserProfile } from './auth';

describe('Auth helpers', () => {
    const prefixes = `
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.
        @prefix owl: <http://www.w3.org/2002/07/owl#>.
        @prefix pim: <http://www.w3.org/ns/pim/space#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
    `;

    function respondWithProfile(webId: string, turtle: string): void {
        FakeServer.respondOnce(
            webId.split('#')[0] as string,
            FakeResponse.success(`
                ${prefixes}

                <>
                    a foaf:PersonalProfileDocument ;
                    foaf:primaryTopic <${webId}> .

                <${webId}>
                    solid:oidcIssuer <https://idp.example.com> ;
                    pim:storage </> .

                ${turtle}
            `),
        );
    }

    function respondWithDocument(url: string, turtle: string, headers?: Record<string, string>): void {
        FakeServer.respondOnce(url, FakeResponse.success(`${prefixes}\n${turtle}`, headers));
    }

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('reads NSS profiles', async () => {
        // Arrange
        const webId = 'https://alice.solidcommunity.net/profile/card#me';

        FakeServer.respondOnce(
            'https://alice.solidcommunity.net/profile/card',
            FakeResponse.success(
                `
                    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
                    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
                    @prefix pim: <http://www.w3.org/ns/pim/space#>.
                    @prefix schema: <http://schema.org/>.

                    <>
                        a foaf:PersonalProfileDocument ;
                        foaf:maker <#me> ;
                        foaf:primaryTopic <#me> .

                    <#me>
                        a foaf:Person, schema:Person ;
                        foaf:name "Alice" ;
                        pim:preferencesFile </settings/prefs.ttl> ;
                        pim:storage </> ;
                        solid:oidcIssuer <https://solidcommunity.net> ;
                        solid:privateTypeIndex </settings/privateTypeIndex.ttl> ;
                        solid:publicTypeIndex </settings/publicTypeIndex.ttl> .
                `,
                { 'WAC-Allow': 'user="read control write"' },
            ),
        );
        FakeServer.respondOnce(
            'https://alice.solidcommunity.net/settings/prefs.ttl',
            FakeResponse.success(
                `
                    @prefix dct: <http://purl.org/dc/terms/>.
                    @prefix pim: <http://www.w3.org/ns/pim/space#>.
                    @prefix solid: <http://www.w3.org/ns/solid/terms#>.

                    <>
                        a pim:ConfigurationFile ;
                        dct:title "Preferences file" .

                    </profile/card#me>
                        solid:privateTypeIndex </settings/privateTypeIndex.ttl> .
                `,
                { 'WAC-Allow': 'user="read control write"' },
            ),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);

        expect(profile).toEqual({
            webId,
            name: 'Alice',
            shallow: false,
            cloakedDocumentUrls: [],
            oidcIssuerUrl: 'https://solidcommunity.net',
            preferencesFileUrl: 'https://alice.solidcommunity.net/settings/prefs.ttl',
            storageUrls: ['https://alice.solidcommunity.net/'],
            privateTypeIndexUrls: ['https://alice.solidcommunity.net/settings/privateTypeIndex.ttl'],
            publicTypeIndexUrls: ['https://alice.solidcommunity.net/settings/publicTypeIndex.ttl'],
            writableProfileUrl: 'https://alice.solidcommunity.net/profile/card',
        });
    });

    it('reads ESS profiles (public)', async () => {
        // Arrange
        const webId = 'https://id.inrupt.com/alice';

        // The first request returns a 303 to `${webId}?lookup`,
        // but in order to simplify mocking requests we're assuming it doesn't.
        FakeServer.respondOnce(
            'https://id.inrupt.com/alice',
            FakeResponse.success(`
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.
                @prefix solid: <http://www.w3.org/ns/solid/terms#>.
                @prefix pim: <http://www.w3.org/ns/pim/space#>.
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

                <${webId}>
                    a foaf:Agent ;
                    rdfs:seeAlso <https://storage.inrupt.com/storage-hash/extendedProfile> ;
                    pim:storage <https://storage.inrupt.com/storage-hash/> ;
                    solid:oidcIssuer <https://login.inrupt.com> ;
                    foaf:isPrimaryTopicOf <https://storage.inrupt.com/storage-hash/extendedProfile> .
            `),
        );
        FakeServer.respondOnce(
            'https://storage.inrupt.com/storage-hash/extendedProfile',
            new FakeResponse(undefined, undefined, 401),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);

        expect(profile).toEqual({
            webId,
            shallow: false,
            cloakedDocumentUrls: ['https://storage.inrupt.com/storage-hash/extendedProfile'],
            oidcIssuerUrl: 'https://login.inrupt.com',
            storageUrls: ['https://storage.inrupt.com/storage-hash/'],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            writableProfileUrl: null,
        });
    });

    it('reads ESS profiles (authenticated)', async () => {
        // Arrange
        const webId = 'https://id.inrupt.com/alice';

        // The first request returns a 303 to `${webId}?lookup`,
        // but in order to simplify mocking requests we're assuming it doesn't.
        FakeServer.respondOnce(
            'https://id.inrupt.com/alice',
            FakeResponse.success(`
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.
                @prefix solid: <http://www.w3.org/ns/solid/terms#>.
                @prefix pim: <http://www.w3.org/ns/pim/space#>.
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

                <${webId}>
                    a foaf:Agent ;
                    rdfs:seeAlso <https://storage.inrupt.com/storage-hash/extendedProfile> ;
                    pim:storage <https://storage.inrupt.com/storage-hash/> ;
                    solid:oidcIssuer <https://login.inrupt.com> ;
                    foaf:isPrimaryTopicOf <https://storage.inrupt.com/storage-hash/extendedProfile> .
            `),
        );
        FakeServer.respondOnce(
            'https://storage.inrupt.com/storage-hash/extendedProfile',
            FakeResponse.success(
                `
                    @prefix foaf:  <http://xmlns.com/foaf/0.1/> .
                    @prefix schema:   <http://schema.org/> .

                    <${webId}>
                        a foaf:Person, schema:Person ;
                        foaf:name "Alice" .

                    <https://storage.inrupt.com/storage-hash/extendedProfile>
                        a foaf:Document ;
                        foaf:maker <${webId}> ;
                        foaf:primaryTopic  <${webId}> .
                `,
                { 'WAC-Allow': 'user="read control write"' },
            ),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);

        expect(profile).toEqual({
            webId,
            name: 'Alice',
            shallow: false,
            cloakedDocumentUrls: [],
            oidcIssuerUrl: 'https://login.inrupt.com',
            storageUrls: ['https://storage.inrupt.com/storage-hash/'],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            writableProfileUrl: 'https://storage.inrupt.com/storage-hash/extendedProfile',
        });
    });

    it('reads use.id profiles', async () => {
        // Arrange
        const webId = 'https://use.id/alice';
        const profileTurtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/>.
            @prefix solid: <http://www.w3.org/ns/solid/terms#>.
            @prefix pim: <http://www.w3.org/ns/pim/space#>.

            <${webId}/profile>
                a foaf:PersonalProfileDocument;
                foaf:maker <${webId}>;
                foaf:primaryTopic <${webId}>.

            <${webId}>
                solid:oidcIssuer <https://idp.use.id/>;
                pim:storage <https://pods.use.id/storage-hash/>.
        `;

        // The first request returns a 303 to `${webId}/profile`,
        // but in order to simplify mocking requests we're assuming it doesn't.
        FakeServer.respondOnce(
            'https://use.id/alice',
            FakeResponse.success(profileTurtle, { 'WAC-Allow': 'user="read"' }),
        );
        FakeServer.respondOnce(
            'https://use.id/alice/profile',
            FakeResponse.success(profileTurtle, { 'WAC-Allow': 'user="read"' }),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);

        expect(profile).toEqual({
            webId,
            shallow: false,
            cloakedDocumentUrls: [],
            oidcIssuerUrl: 'https://idp.use.id/',
            storageUrls: ['https://pods.use.id/storage-hash/'],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            writableProfileUrl: null,
        });
    });

    it('reads malformed storage urls', async () => {
        // Arrange
        const webId = 'https://alice.solidcommunity.net/profile/card#me';

        FakeServer.respondOnce(
            'https://alice.solidcommunity.net/profile/card',
            FakeResponse.success(
                `
                    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
                    @prefix pim: <http://www.w3.org/ns/pim/space#>.
                    @prefix schema: <http://schema.org/>.

                    <>
                        a foaf:PersonalProfileDocument ;
                        foaf:maker <#me> ;
                        foaf:primaryTopic <#me> .

                    <#me>
                        a foaf:Person, schema:Person ;
                        foaf:name "Alice" ;
                        pim:storage "/" .
                `,
            ),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(1);

        expect(profile).toEqual({
            webId,
            name: 'Alice',
            shallow: false,
            cloakedDocumentUrls: [],
            storageUrls: ['https://alice.solidcommunity.net/'],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            writableProfileUrl: null,
        });
    });

    it('throws errors reading required profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        FakeServer.respondOnce('https://pod.example.com/profile/card', FakeResponse.success('invalid turtle'));

        // Act
        const fetchProfile = fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        await expect(fetchProfile).rejects.toBeInstanceOf(MalformedSolidDocument);

        expect(FakeServer.getRequests()).toHaveLength(1);
    });

    it('follows discovery links to the preferences file', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(webId, `<#me> rdfs:seeAlso </profile/extended> .`);
        respondWithDocument(
            'https://pod.example.com/profile/extended',
            `<${webId}> pim:preferencesFile </settings/prefs.ttl> .`,
        );
        respondWithDocument(
            'https://pod.example.com/settings/prefs.ttl',
            `<${webId}> solid:privateTypeIndex </settings/privateTypeIndex.ttl> .`,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(3);
        expect(profile.preferencesFileUrl).toEqual('https://pod.example.com/settings/prefs.ttl');
        expect(profile.privateTypeIndexUrls).toEqual(['https://pod.example.com/settings/privateTypeIndex.ttl']);
        expect(profile.cloakedDocumentUrls).toEqual([]);
    });

    it('reads profiles with cloaked preferences files', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(webId, `<#me> pim:preferencesFile </settings/prefs.ttl> .`);
        FakeServer.respondOnce('https://pod.example.com/settings/prefs.ttl', 401);

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);
        expect(profile.preferencesFileUrl).toEqual('https://pod.example.com/settings/prefs.ttl');
        expect(profile.privateTypeIndexUrls).toEqual([]);
        expect(profile.cloakedDocumentUrls).toEqual(['https://pod.example.com/settings/prefs.ttl']);
    });

    it('reads profiles with cloaked extended profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                <#me>
                    rdfs:seeAlso </profile/extended> ;
                    pim:preferencesFile </settings/prefs.ttl> .
            `,
        );
        FakeServer.respondOnce('https://pod.example.com/profile/extended', 403);
        respondWithDocument(
            'https://pod.example.com/settings/prefs.ttl',
            `<${webId}> solid:privateTypeIndex </settings/privateTypeIndex.ttl> .`,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(3);
        expect(profile.privateTypeIndexUrls).toEqual(['https://pod.example.com/settings/privateTypeIndex.ttl']);
        expect(profile.cloakedDocumentUrls).toEqual(['https://pod.example.com/profile/extended']);
    });

    it('reads profiles with multiple type indexes', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                <#me>
                    pim:preferencesFile </settings/prefs.ttl> ;
                    solid:publicTypeIndex </settings/publicTypeIndex.ttl>, </settings/publicTypeIndex-2.ttl> .
            `,
        );
        respondWithDocument(
            'https://pod.example.com/settings/prefs.ttl',
            `
                <${webId}>
                    solid:publicTypeIndex </settings/publicTypeIndex.ttl> ;
                    solid:privateTypeIndex </settings/privateTypeIndex.ttl>, </settings/privateTypeIndex-2.ttl> .
            `,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(profile.publicTypeIndexUrls).toEqual([
            'https://pod.example.com/settings/publicTypeIndex.ttl',
            'https://pod.example.com/settings/publicTypeIndex-2.ttl',
        ]);
        expect(profile.privateTypeIndexUrls).toEqual([
            'https://pod.example.com/settings/privateTypeIndex.ttl',
            'https://pod.example.com/settings/privateTypeIndex-2.ttl',
        ]);
    });

    it('reads shallow profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                <#me>
                    rdfs:seeAlso </profile/extended> ;
                    pim:preferencesFile </settings/prefs.ttl> .
            `,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, {
            fetch: FakeServer.fetch,
            shallow: true,
            maxDepth: 5,
            required: true,
        });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(1);
        expect(profile).toEqual({
            webId,
            shallow: true,
            cloakedDocumentUrls: [],
            oidcIssuerUrl: 'https://idp.example.com',
            preferencesFileUrl: 'https://pod.example.com/settings/prefs.ttl',
            storageUrls: ['https://pod.example.com/'],
            publicTypeIndexUrls: [],
            privateTypeIndexUrls: [],
            writableProfileUrl: null,
        });
    });

    it('reads shallow profiles without storage', async () => {
        // Arrange
        const webId = 'https://pod.example.com/alice/profile/card#me';

        FakeServer.respondOnce(
            'https://pod.example.com/alice/profile/card',
            FakeResponse.success(`
                ${prefixes}

                <#me>
                    solid:oidcIssuer <https://idp.example.com> ;
                    rdfs:seeAlso </alice/profile/extended> .
            `),
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, shallow: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(1);
        expect(profile?.shallow).toBe(true);
        expect(profile?.storageUrls).toEqual([]);
        expect(profile?.oidcIssuerUrl).toEqual('https://idp.example.com');
    });

    it('throws reading full profiles without storage', async () => {
        // Arrange
        const webId = 'https://pod.example.com/alice/profile/card#me';

        FakeServer.respondOnce(
            'https://pod.example.com/alice/profile/card',
            FakeResponse.success(`
                ${prefixes}

                <#me> solid:oidcIssuer <https://idp.example.com> .
            `),
        );

        // Act
        const fetchProfile = fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        await expect(fetchProfile).rejects.toThrow(`Could not find any storage for ${webId}.`);
    });

    it('only reads the oidc issuer from the WebID document', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';
        const respond = () => {
            respondWithProfile(webId, `<#me> rdfs:seeAlso </profile/extended> .`);
            respondWithDocument(
                'https://pod.example.com/profile/extended',
                `<${webId}> solid:oidcIssuer <https://evil.example.com> .`,
            );
        };

        // Act
        respond();
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        respond();
        const shallowProfile = await fetchLoginUserProfile(webId, {
            fetch: FakeServer.fetch,
            shallow: true,
            required: true,
        });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(3);
        expect(profile.oidcIssuerUrl).toEqual('https://idp.example.com');
        expect(shallowProfile.oidcIssuerUrl).toEqual('https://idp.example.com');
    });

    it('ignores oidc issuers from extended profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        FakeServer.respondOnce(
            'https://pod.example.com/profile/card',
            FakeResponse.success(`
                ${prefixes}

                <#me>
                    a foaf:Person ;
                    pim:storage </> ;
                    foaf:isPrimaryTopicOf </profile/extended> .

                <> a foaf:PersonalProfileDocument .
            `),
        );
        respondWithDocument(
            'https://pod.example.com/profile/extended',
            `<${webId}> solid:oidcIssuer <https://evil.example.com> .`,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);
        expect(profile.oidcIssuerUrl).toBeUndefined();
    });

    it('passes all triples to onLoaded', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';
        let store: SolidStore | null = null;

        respondWithProfile(
            webId,
            `
                <#me>
                    rdfs:seeAlso </profile/extended> ;
                    vcard:hasAddress [ vcard:locality "Barcelona" ] .
            `,
        );
        respondWithDocument(
            'https://pod.example.com/profile/extended',
            `<https://pod.example.com/avatar.png> vcard:note "Hello world" .`,
        );

        // Act
        await fetchLoginUserProfile(webId, {
            fetch: FakeServer.fetch,
            required: true,
            onLoaded: (loadedStore) => (store = loadedStore),
        });

        // Assert
        expect(store).not.toBeNull();
        expect(store!.statement(undefined, 'vcard:locality')?.object.value).toEqual('Barcelona');
        expect(store!.statement('https://pod.example.com/avatar.png', 'vcard:note')?.object.value).toEqual(
            'Hello world',
        );
    });

    it('follows reversed primary topic links', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                </profile/extended> foaf:primaryTopic <#me> .
                </profile/other> foaf:primaryTopic </profile/card#other> .
            `,
        );
        respondWithDocument('https://pod.example.com/profile/extended', `<${webId}> foaf:name "Alice" .`);

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(2);
        expect(FakeServer.getRequests('https://pod.example.com/profile/other')).toHaveLength(0);
        expect(profile.name).toEqual('Alice');
    });

    it('stops following links in cycles and past the max depth', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(webId, `<#me> rdfs:seeAlso </profile/one> .`);
        respondWithDocument(
            'https://pod.example.com/profile/one',
            `<${webId}> rdfs:seeAlso </profile/two>, </profile/card>, </profile/one> .`,
        );
        respondWithDocument('https://pod.example.com/profile/two', `<${webId}> rdfs:seeAlso </profile/three> .`);
        respondWithDocument('https://pod.example.com/profile/three', `<${webId}> rdfs:seeAlso </profile/one> .`);

        // Act
        await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });
        const requestsWithDefaultDepth = FakeServer.getRequests().map((request) => request.url);

        FakeServer.reset();
        respondWithProfile(webId, `<#me> rdfs:seeAlso </profile/one> .`);
        respondWithDocument('https://pod.example.com/profile/one', `<${webId}> rdfs:seeAlso </profile/two> .`);

        await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true, maxDepth: 1 });
        const requestsWithMaxDepth = FakeServer.getRequests().map((request) => request.url);

        // Assert
        expect(requestsWithDefaultDepth).toEqual([
            'https://pod.example.com/profile/card',
            'https://pod.example.com/profile/one',
            'https://pod.example.com/profile/two',
            'https://pod.example.com/profile/three',
        ]);
        expect(requestsWithMaxDepth).toEqual([
            'https://pod.example.com/profile/card',
            'https://pod.example.com/profile/one',
        ]);
    });

    it('only follows links about the WebID', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                <#me> owl:sameAs <https://other.example.com/profile/card#me> .
                <#bob>
                    rdfs:seeAlso </profile/bob> ;
                    foaf:isPrimaryTopicOf </profile/bob-extended> ;
                    pim:preferencesFile </settings/bob-prefs.ttl> .
            `,
        );

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(1);
        expect(profile.preferencesFileUrl).toBeUndefined();
    });

    it('skips linked documents that cannot be read', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';

        respondWithProfile(
            webId,
            `
                <#me>
                    foaf:name "Alice" ;
                    rdfs:seeAlso </missing>, <https://alice.example.com/>, <https://offline.example.com/> .
            `,
        );
        FakeServer.respondOnce('https://alice.example.com/', '<!DOCTYPE html><html><body>Hello!</body></html>');
        FakeServer.respondOnceWith('https://offline.example.com/', () => {
            throw new TypeError('Failed to fetch');
        });

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        // oxlint-disable-next-line no-console
        expect(console.warn).toHaveBeenCalledTimes(3);
        expect(profile.name).toEqual('Alice');
        expect(profile.cloakedDocumentUrls).toEqual([]);
    });

    it('only uses profile documents as writable profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';
        const writable = { 'WAC-Allow': 'user="read write"' };

        respondWithProfile(
            webId,
            `
                <#me>
                    rdfs:seeAlso </contacts> ;
                    pim:preferencesFile </settings/prefs.ttl> ;
                    foaf:isPrimaryTopicOf </profile/extended> .
            `,
        );
        respondWithDocument('https://pod.example.com/contacts', `<${webId}> foaf:knows <https://bob.example/#me> .`, writable); // prettier-ignore
        respondWithDocument('https://pod.example.com/settings/prefs.ttl', '<> a pim:ConfigurationFile .', writable);
        respondWithDocument('https://pod.example.com/profile/extended', `<${webId}> foaf:name "Alice" .`, writable);

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(4);
        expect(profile.writableProfileUrl).toEqual('https://pod.example.com/profile/extended');
    });

    it('uses documents declaring the WebID as their primary topic as writable profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';
        const writable = { 'WAC-Allow': 'user="read write"' };

        respondWithProfile(webId, `<#me> rdfs:seeAlso </settings/prefs.ttl>, </profile/extended> .`);
        respondWithDocument('https://pod.example.com/settings/prefs.ttl', '<> a pim:ConfigurationFile .', writable);
        respondWithDocument('https://pod.example.com/profile/extended', `<> foaf:primaryTopic <${webId}> .`, writable);

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(profile.writableProfileUrl).toEqual('https://pod.example.com/profile/extended');
    });

    it('does not use other writable documents as writable profiles', async () => {
        // Arrange
        const webId = 'https://pod.example.com/profile/card#me';
        const writable = { 'WAC-Allow': 'user="read write"' };

        respondWithProfile(webId, `<#me> rdfs:seeAlso </contacts> ; pim:preferencesFile </settings/prefs.ttl> .`);
        respondWithDocument('https://pod.example.com/contacts', `<${webId}> foaf:knows <https://bob.example/#me> .`, writable); // prettier-ignore
        respondWithDocument('https://pod.example.com/settings/prefs.ttl', '<> a pim:ConfigurationFile .', writable);

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch, required: true });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(3);
        expect(profile.writableProfileUrl).toBeNull();
    });

    it('infers profile types', () => {
        expectTypeOf(() => fetchLoginUserProfile('', { shallow: true })).returns.resolves.toEqualTypeOf<ShallowSolidUserProfile | null>(); // prettier-ignore
        expectTypeOf(() => fetchLoginUserProfile('', { shallow: true, required: true })).returns.resolves.toEqualTypeOf<ShallowSolidUserProfile>(); // prettier-ignore
        expectTypeOf(() => fetchLoginUserProfile('')).returns.resolves.toEqualTypeOf<CompleteSolidUserProfile | null>();
        expectTypeOf(() => fetchLoginUserProfile('', { shallow: false, required: true })).returns.resolves.toEqualTypeOf<CompleteSolidUserProfile>(); // prettier-ignore
        expectTypeOf(() => fetchLoginUserProfile('', { shallow: Math.random() > 0.5 })).returns.resolves.toEqualTypeOf<SolidUserProfile | null>(); // prettier-ignore
        expectTypeOf<CompleteSolidUserProfile['storageUrls']>().toEqualTypeOf<[string, ...string[]]>();
    });
});
