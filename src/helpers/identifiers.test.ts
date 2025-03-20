import { describe, expect, it } from 'vitest';

import { mintJsonLDIdentifiers } from '@noeldemartin/solid-utils/helpers';
import { parseResourceSubject } from '@noeldemartin/solid-utils/helpers/identifiers';
import type { JsonLD } from '@noeldemartin/solid-utils/helpers';

describe('Identifiers helpers', () => {

    it('mints JsonLD identifiers', () => {
        // Arrange
        const jsonld = {
            '@context': { '@vocab': 'https://schema.org/' },
            '@type': 'Recipe',
            'name': 'Ramen',
            'ingredients': ['Broth', 'Noodles'],
            'instructions': [
                {
                    '@type': 'HowToStep',
                    'text': 'Boil Noodles',
                },
                {
                    '@type': 'HowToStep',
                    'text': 'Dip them into the broth',
                },
            ],
            'http://purl.org/dc/terms/created': {
                '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
                '@value': '1997-07-21T23:42:00.000Z',
            },
        };

        // Act
        const jsonldWithIds = mintJsonLDIdentifiers(jsonld);

        // Assert
        expect(jsonldWithIds['@id']).not.toBeUndefined();

        const createdAt = jsonldWithIds['http://purl.org/dc/terms/created'] as Record<string, unknown>;
        expect(createdAt['@id']).toBeUndefined();

        const instructions = jsonldWithIds['instructions'] as [JsonLD, JsonLD];
        expect(instructions[0]['@id']).not.toBeUndefined();
        expect(instructions[1]['@id']).not.toBeUndefined();
    });

    it('parses subjects', () => {
        expect(parseResourceSubject('https://my-pod.com/profile/card#me')).toEqual({
            containerUrl: 'https://my-pod.com/profile/',
            documentName: 'card',
            resourceHash: 'me',
        });
        expect(parseResourceSubject('https://my-pod.com/about')).toEqual({
            containerUrl: 'https://my-pod.com/',
            documentName: 'about',
        });
        expect(parseResourceSubject('/profile/card#me')).toEqual({
            containerUrl: '/profile/',
            documentName: 'card',
            resourceHash: 'me',
        });
        expect(parseResourceSubject('/about#sections')).toEqual({
            containerUrl: '/',
            documentName: 'about',
            resourceHash: 'sections',
        });
        expect(parseResourceSubject('about#sections')).toEqual({
            documentName: 'about',
            resourceHash: 'sections',
        });
        expect(parseResourceSubject('about')).toEqual({
            documentName: 'about',
        });
        expect(parseResourceSubject('')).toEqual({});
    });

});
