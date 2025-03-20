import { describe, expect, it } from 'vitest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';

// eslint-disable-next-line max-len
import UnsupportedAuthorizationProtocolError from '@noeldemartin/solid-utils/errors/UnsupportedAuthorizationProtocolError';

import { fetchSolidDocumentACL } from './wac';

describe('WAC helpers', () => {

    it('resolves relative ACL urls', async () => {
        // Arrange
        const server = new FakeServer();
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        server.respondOnce(documentUrl, FakeResponse.success(undefined, { Link: '<my-favorite-movie.acl>;rel="acl"' }));
        server.respondOnce(
            `${documentUrl}.acl`,
            FakeResponse.success(`
                @prefix acl: <http://www.w3.org/ns/auth/acl#>.
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.

                <#owner>
                    a acl:Authorization;
                    acl:agent <https://example.com/alice/profile/card#me>;
                    acl:accessTo <./my-favorite-movie> ;
                    acl:mode acl:Read, acl:Write, acl:Control .
            `),
        );

        // Act
        const { url, effectiveUrl, document } = await fetchSolidDocumentACL(documentUrl, server.fetch);

        // Assert
        expect(url).toEqual(`${documentUrl}.acl`);
        expect(effectiveUrl).toEqual(url);
        expect(document.contains(`${documentUrl}.acl#owner`, 'rdf:type', 'acl:Authorization')).toBe(true);

        expect(server.getRequests()).toHaveLength(2);
        expect(server.getRequest(documentUrl)?.method).toEqual('HEAD');
        expect(server.getRequest(url)).not.toBeNull();
    });

    it('fails with ACP resources', async () => {
        // Arrange
        const server = new FakeServer();
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        server.respondOnce(documentUrl, FakeResponse.success(undefined, { Link: '<my-favorite-movie.acl>;rel="acl"' }));
        server.respondOnce(
            `${documentUrl}.acl`,
            FakeResponse.success(undefined, {
                Link: '<http://www.w3.org/ns/solid/acp#AccessControlResource>; rel="type"',
            }),
        );

        // Act
        const promisedDocument = fetchSolidDocumentACL(documentUrl, server.fetch);

        // Assert
        await expect(promisedDocument).rejects.toBeInstanceOf(UnsupportedAuthorizationProtocolError);
    });

});
