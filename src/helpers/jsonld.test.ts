import { describe, expect, it } from 'vitest';

import { formatJsonLD } from './jsonld';

describe('JsonLD helpers', () => {

    it('formats graphs', async () => {
        // Arrange
        const graph = {
            '@graph': [
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#it',
                    '@type': 'https://schema.org/Movie',
                    'https://schema.org/name': 'Spirited Away',
                    'https://schema.org/review': [
                        { '@id': 'https://alice.pod.com/movies/spirited-away#review-1' },
                        { '@id': 'https://alice.pod.com/movies/spirited-away#review-2' },
                    ],
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#watched',
                    '@type': 'https://schema.org/WatchAction',
                    'https://schema.org/object': {
                        '@id': 'https://alice.pod.com/movies/spirited-away#it',
                    },
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#review-1',
                    '@type': 'https://schema.org/Review',
                    'https://schema.org/reviewBody': 'First review',
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#review-2',
                    '@type': 'https://schema.org/Review',
                    'https://schema.org/reviewBody': 'Second review',
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#list-1',
                    '@type': 'https://schema.org/ItemList',
                    'https://schema.org/name': 'Greatest anime movies',
                    'https://schema.org/itemListElement': [{ '@id': 'https://alice.pod.com/movies/spirited-away#it' }],
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#list-2',
                    '@type': 'https://schema.org/ItemList',
                    'https://schema.org/name': 'Studio Ghibli movies',
                    'https://schema.org/itemListElement': [{ '@id': 'https://alice.pod.com/movies/spirited-away#it' }],
                },
            ],
        };

        const compacted = {
            '@context': {
                '@vocab': 'https://schema.org/',
                'watchAction': { '@reverse': 'https://schema.org/object' },
                'itemLists': { '@reverse': 'https://schema.org/itemListElement' },
            },
            '@id': 'https://alice.pod.com/movies/spirited-away#it',
            '@type': 'Movie',
            'name': 'Spirited Away',
            'watchAction': {
                '@id': 'https://alice.pod.com/movies/spirited-away#watched',
                '@type': 'WatchAction',
            },
            'review': [
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#review-1',
                    '@type': 'Review',
                    'reviewBody': 'First review',
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#review-2',
                    '@type': 'Review',
                    'reviewBody': 'Second review',
                },
            ],
            'itemLists': [
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#list-1',
                    '@type': 'ItemList',
                    'name': 'Greatest anime movies',
                },
                {
                    '@id': 'https://alice.pod.com/movies/spirited-away#list-2',
                    '@type': 'ItemList',
                    'name': 'Studio Ghibli movies',
                },
            ],
        };

        // Act
        const formatted = await formatJsonLD(graph, { resourceId: 'https://alice.pod.com/movies/spirited-away#it' });

        // Assert
        expect(formatted).toEqual(compacted);
    });

});
