import type { Fetch } from '@/helpers/io';

import { fetchSolidDocumentACL } from './wac';

describe('WAC helpers', () => {

    it('resolves relative ACL urls', async () => {
        // Arrange
        const documentUrl = 'https://example.com/alice/movies/my-favorite-movie';
        const responses = [
            new Response('', { headers: { Link: '<my-favorite-movie.acl>;rel="acl"' } }),
            new Response(`
                @prefix acl: <http://www.w3.org/ns/auth/acl#>.
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.

                <#owner>
                    a acl:Authorization;
                    acl:agent <https://example.com/alice/profile/card#me>;
                    acl:accessTo <./my-favorite-movie> ;
                    acl:mode acl:Read, acl:Write, acl:Control .
            `),
        ];
        const fetch = jest.fn(() => Promise.resolve(responses.shift()));

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
                'rdfs:type',
                'acl:Authorization',
            ),
        ).toBe(true);

        expect(fetch).toHaveBeenCalledTimes(2);

        expect((fetch.mock.calls[0] as unknown as [RequestInfo, RequestInit])[0]).toEqual(documentUrl);
        expect((fetch.mock.calls[0] as unknown as [RequestInfo, RequestInit])[1].method).toEqual('HEAD');

        expect((fetch.mock.calls[1] as unknown as [RequestInfo, RequestInit])[0]).toEqual(url);
    });

});
