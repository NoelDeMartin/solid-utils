import { describe, expect, it } from 'vite-plus/test';

import { getLinkHeaderUrl, getLinkHeaderUrls } from './links';

describe('Link helpers', () => {
    it('gets urls by relation', () => {
        // Arrange
        const headers = new Headers({
            Link: '<.acl>; rel="acl", <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        });

        // Act
        const aclUrl = getLinkHeaderUrl(headers, 'acl');
        const typeUrls = getLinkHeaderUrls(headers, 'type');

        // Assert
        expect(aclUrl).toEqual('.acl');
        expect(typeUrls).toEqual(['http://www.w3.org/ns/ldp#BasicContainer']);
    });

    it('resolves relative urls', () => {
        // Act
        const url = getLinkHeaderUrl('<spirited-away.acl>; rel="acl"', 'acl', {
            baseUrl: 'https://alice.example/movies/spirited-away',
        });

        // Assert
        expect(url).toEqual('https://alice.example/movies/spirited-away.acl');
    });

    it('parses params in any order and format', () => {
        // Arrange
        const header = [
            '<https://alice.example/>; anchor="https://alice.example/a,b"; rel="describedby"',
            '<https://alice.example/.acr>;rel=acl;title="Access, control"',
            '<http://www.w3.org/ns/pim/space#Storage>; rel="type http://example.org/other"',
        ].join(', ');

        // Act
        const describedByUrl = getLinkHeaderUrl(header, 'describedBy');
        const aclUrl = getLinkHeaderUrl(header, 'acl');
        const typeUrls = getLinkHeaderUrls(header, 'type');

        // Assert
        expect(describedByUrl).toEqual('https://alice.example/');
        expect(aclUrl).toEqual('https://alice.example/.acr');
        expect(typeUrls).toEqual(['http://www.w3.org/ns/pim/space#Storage']);
    });

    it('returns nothing without matching links', () => {
        // Assert
        expect(getLinkHeaderUrl(new Headers(), 'acl')).toBeNull();
        expect(getLinkHeaderUrl(null, 'acl')).toBeNull();
        expect(getLinkHeaderUrl('<.meta>; rel="describedby"', 'acl')).toBeNull();
        expect(getLinkHeaderUrls('not a link header', 'acl')).toEqual([]);
    });
});
