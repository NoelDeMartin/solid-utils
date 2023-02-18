import UnsupportedAuthorizationProtocolError from '@/errors/UnsupportedAuthorizationProtocolError';
import type { Fetch } from '@/helpers/io';

import { mockFetch } from '@/testing/mocking';

import { fetchSolidDocumentACL } from './wac';

describe('WAC helpers', () => {

    it('resolves relative ACL urls', async () => {
        // Arrange
        const fetch = mockFetch();
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        fetch.mockResponse('', { Link: '<my-favorite-movie.acl>;rel="acl"' });
        fetch.mockResponse(`
            @prefix acl: <http://www.w3.org/ns/auth/acl#>.
            @prefix foaf: <http://xmlns.com/foaf/0.1/>.

            <#owner>
                a acl:Authorization;
                acl:agent <https://example.com/alice/profile/card#me>;
                acl:accessTo <./my-favorite-movie> ;
                acl:mode acl:Read, acl:Write, acl:Control .
        `);

        // Act
        const {
            url,
            effectiveUrl,
            document,
        } = await fetchSolidDocumentACL(documentUrl, fetch as unknown as Fetch);

        // Assert
        expect(url).toEqual('https://example.com/alice/movies/my-favorite-movie.acl');
        expect(effectiveUrl).toEqual(url);
        expect(
            document.contains(
                'https://example.com/alice/movies/my-favorite-movie.acl#owner',
                'rdf:type',
                'acl:Authorization',
            ),
        ).toBe(true);

        expect(fetch).toHaveBeenCalledTimes(2);

        expect((fetch.mock.calls[0] as unknown as [RequestInfo, RequestInit])[0]).toEqual(documentUrl);
        expect((fetch.mock.calls[0] as unknown as [RequestInfo, RequestInit])[1].method).toEqual('HEAD');

        expect((fetch.mock.calls[1] as unknown as [RequestInfo, RequestInit])[0]).toEqual(url);
    });

    it('fails with ACP resources', async () => {
        // Arrange
        const fetch = mockFetch();
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';

        fetch.mockResponse('', { Link: '<my-favorite-movie.acl>;rel="acl"' });
        fetch.mockResponse('', { Link: '<http://www.w3.org/ns/solid/acp#AccessControlResource>; rel="type"' });

        // Act
        const promisedDocument = fetchSolidDocumentACL(documentUrl, fetch as unknown as Fetch);

        // Assert
        await expect(promisedDocument).rejects.toBeInstanceOf(UnsupportedAuthorizationProtocolError);
    });

});
