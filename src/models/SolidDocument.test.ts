import { describe, expect, it } from 'vitest';

import SolidDocument from '@noeldemartin/solid-utils/models/SolidDocument';
import { turtleToQuadsSync } from '@noeldemartin/solid-utils/helpers';

describe('SolidDocument', () => {

    it('Identifies storage documents', () => {
        const hasStorageHeader = (link: string) => {
            const document = new SolidDocument('', [], new Headers({ Link: link }));

            return document.isStorage();
        };

        /* eslint-disable max-len */
        expect(hasStorageHeader('')).toBe(false);
        expect(hasStorageHeader('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')).toBe(true);
        expect(hasStorageHeader('<http://www.w3.org/ns/pim/space#Storage>; rel="something-else"; rel="type"')).toBe(
            true,
        );
        expect(
            hasStorageHeader(
                '<http://www.w3.org/ns/pim/space#Storage>; rel="something-else", <http://example.com>; rel="type"',
            ),
        ).toBe(false);
        /* eslint-enable max-len */
    });

    it('Parses last modified from header', () => {
        const document = new SolidDocument('', [], new Headers({ 'Last-Modified': 'Fri, 03 Sept 2021 16:09:12 GMT' }));

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

    it('Parses last modified from document purl:modified', () => {
        const document = new SolidDocument(
            'https://pod.example.org/my-document',
            turtleToQuadsSync(
                `
                <./fallback>
                    <http://purl.org/dc/terms/modified>
                    "2021-09-03T16:23:25.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .

                <>
                    <http://purl.org/dc/terms/modified>
                    "2021-09-03T16:09:12.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
            `,
                { baseIRI: 'https://pod.example.org/my-document' },
            ),
            new Headers({ 'Last-Modified': 'invalid date' }),
        );

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

    it('Parses last modified from any purl date', () => {
        const document = new SolidDocument(
            'https://pod.example.org/my-document',
            turtleToQuadsSync(
                `
                <./fallback-one>
                    <http://purl.org/dc/terms/modified>
                    "2021-05-03T16:09:12.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .

                <./fallback-two>
                    <http://purl.org/dc/terms/created>
                    "2021-09-03T16:09:12.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
            `,
                { baseIRI: 'https://pod.example.org/my-document' },
            ),
            new Headers({ 'Last-Modified': 'invalid date' }),
        );

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

});
