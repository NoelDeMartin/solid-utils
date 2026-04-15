import { describe, expect, it } from 'vitest';
import { FakeResponse, FakeServer } from '@noeldemartin/testing';

// eslint-disable-next-line max-len
import UnsupportedAuthorizationProtocol from '@noeldemartin/solid-utils/errors/UnsupportedAuthorizationProtocol';

import { fetchSolidDocumentACL } from './wac';

describe('WAC helpers', () => {

    it('resolves relative ACL urls', async () => {
        // Arrange
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        FakeServer.respondOnce(
            documentUrl,
            FakeResponse.success(undefined, { Link: '<my-favorite-movie.acl>;rel="acl"' }),
        );
        FakeServer.respondOnce(
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
        const { url, effectiveUrl, document } = await fetchSolidDocumentACL(documentUrl, FakeServer.fetch);

        // Assert
        expect(url).toEqual(`${documentUrl}.acl`);
        expect(effectiveUrl).toEqual(url);
        expect(document.contains(`${documentUrl}.acl#owner`, 'rdf:type', 'acl:Authorization')).toBe(true);

        expect(FakeServer.getRequests()).toHaveLength(2);
        expect(FakeServer.getRequest(documentUrl)?.method).toEqual('HEAD');
        expect(FakeServer.getRequest(url)).not.toBeNull();
    });

    it('resolves ACL urls from root', async () => {
        // Arrange
        const rootUrl = 'https://example.com/';
        const userUrl = `${rootUrl}alice/`;
        const profileUrl = `${userUrl}profile/`;
        const documentUrl = `${profileUrl}card`;

        FakeServer.respondOnce(rootUrl, FakeResponse.success(undefined, { Link: '<.acl>;rel="acl"' }));
        FakeServer.respondOnce(userUrl, FakeResponse.success(undefined, { Link: '<.acl>;rel="acl"' }));
        FakeServer.respondOnce(profileUrl, FakeResponse.success(undefined, { Link: '<.acl>;rel="acl"' }));
        FakeServer.respondOnce(documentUrl, FakeResponse.success(undefined, { Link: '<card.acl>;rel="acl"' }));
        FakeServer.respondOnce(
            `${rootUrl}.acl`,
            FakeResponse.success(`
                @prefix acl: <http://www.w3.org/ns/auth/acl#>.
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.

                <#owner>
                    a acl:Authorization;
                    acl:agent <https://example.com/alice/profile/card#me>;
                    acl:accessTo <./> ;
                    acl:mode acl:Read, acl:Write, acl:Control .
            `),
        );
        FakeServer.respondOnce(`${userUrl}.acl`, FakeResponse.notFound());
        FakeServer.respondOnce(`${profileUrl}.acl`, FakeResponse.notFound());
        FakeServer.respondOnce(`${documentUrl}.acl`, FakeResponse.notFound());

        // Act
        const { url, effectiveUrl, document } = await fetchSolidDocumentACL(documentUrl, FakeServer.fetch);

        // Assert
        expect(url).toEqual(`${documentUrl}.acl`);
        expect(effectiveUrl).toEqual(`${rootUrl}.acl`);
        expect(document.contains(`${rootUrl}.acl#owner`, 'rdf:type', 'acl:Authorization')).toBe(true);

        expect(FakeServer.getRequests()).toHaveLength(8);
        expect(FakeServer.getRequest(rootUrl)?.method).toEqual('HEAD');
        expect(FakeServer.getRequest(userUrl)?.method).toEqual('HEAD');
        expect(FakeServer.getRequest(profileUrl)?.method).toEqual('HEAD');
        expect(FakeServer.getRequest(documentUrl)?.method).toEqual('HEAD');
        expect(FakeServer.getRequest(`${rootUrl}.acl`)).not.toBeNull();
        expect(FakeServer.getRequest(`${userUrl}.acl`)).not.toBeNull();
        expect(FakeServer.getRequest(`${profileUrl}.acl`)).not.toBeNull();
        expect(FakeServer.getRequest(`${documentUrl}.acl`)).not.toBeNull();
    });

    it('fails with ACP resources', async () => {
        // Arrange
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        FakeServer.respondOnce(
            documentUrl,
            FakeResponse.success(undefined, { Link: '<my-favorite-movie.acl>;rel="acl"' }),
        );
        FakeServer.respondOnce(
            `${documentUrl}.acl`,
            FakeResponse.success(undefined, {
                Link: '<http://www.w3.org/ns/solid/acp#AccessControlResource>; rel="type"',
            }),
        );

        // Act
        const promisedDocument = fetchSolidDocumentACL(documentUrl, FakeServer.fetch);

        // Assert
        await expect(promisedDocument).rejects.toBeInstanceOf(UnsupportedAuthorizationProtocol);
    });

});
