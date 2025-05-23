import { describe, expect, it } from 'vitest';

import { FakeResponse, FakeServer } from '@noeldemartin/testing';

import { MalformedSolidDocumentError } from '@noeldemartin/solid-utils/errors';

import { fetchLoginUserProfile } from './auth';

describe('Auth helpers', () => {

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

        // Act
        const profile = await fetchLoginUserProfile(webId, { fetch: FakeServer.fetch });

        // Assert
        expect(FakeServer.getRequests()).toHaveLength(1);

        expect(profile).toEqual({
            webId,
            name: 'Alice',
            cloaked: false,
            oidcIssuerUrl: 'https://solidcommunity.net',
            storageUrls: ['https://alice.solidcommunity.net/'],
            privateTypeIndexUrl: 'https://alice.solidcommunity.net/settings/privateTypeIndex.ttl',
            publicTypeIndexUrl: 'https://alice.solidcommunity.net/settings/publicTypeIndex.ttl',
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
            cloaked: true,
            oidcIssuerUrl: 'https://login.inrupt.com',
            storageUrls: ['https://storage.inrupt.com/storage-hash/'],
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
            cloaked: false,
            oidcIssuerUrl: 'https://login.inrupt.com',
            storageUrls: ['https://storage.inrupt.com/storage-hash/'],
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
            cloaked: false,
            oidcIssuerUrl: 'https://idp.use.id/',
            storageUrls: ['https://pods.use.id/storage-hash/'],
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
        await expect(fetchProfile).rejects.toBeInstanceOf(MalformedSolidDocumentError);

        expect(FakeServer.getRequests()).toHaveLength(1);
    });

});
