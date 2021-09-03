import { turtleToQuadsSync } from '@/helpers';
import SolidDocument from '@/models/SolidDocument';

describe('SolidDocument', () => {

    it('Identifies storage documents', () => {
        const hasStorageHeader = (link: string) => {
            const document = new SolidDocument('', [], new Headers({ Link: link }));

            return document.isStorage();
        };

        /* eslint-disable max-len */
        expect(hasStorageHeader('')).toBe(false);
        expect(hasStorageHeader('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')).toBe(true);
        expect(hasStorageHeader('<http://www.w3.org/ns/pim/space#Storage>; rel="something-else"; rel="type"')).toBe(true);
        expect(hasStorageHeader('<http://www.w3.org/ns/pim/space#Storage>; rel="something-else", <http://example.com>; rel="type"')).toBe(false);
        /* eslint-enable max-len */
    });

    it('Parses last modified from header', () => {
        const document = new SolidDocument('', [], new Headers({ 'Last-Modified': 'Fri, 03 Sept 2021 16:09:12 GMT' }));

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

    it('Parses last modified from document quad', () => {
        const document = new SolidDocument(
            'https://pod.example.org/my-document',
            turtleToQuadsSync(`
                <./fallback>
                    <http://purl.org/dc/terms/modified>
                    "2021-09-03T16:23:25.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .

                <>
                    <http://purl.org/dc/terms/modified>
                    "2021-09-03T16:09:12.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
            `, { documentUrl: 'https://pod.example.org/my-document' }),
            new Headers({ 'Last-Modified': 'invalid date' }),
        );

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

    it('Parses last modified from any quad', () => {
        const document = new SolidDocument(
            'https://pod.example.org/my-document',
            turtleToQuadsSync(`
                <./fallback>
                    <http://purl.org/dc/terms/modified>
                    "2021-09-03T16:09:12.000Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
            `, { documentUrl: 'https://pod.example.org/my-document' }),
            new Headers({ 'Last-Modified': 'invalid date' }),
        );

        expect(document.getLastModified()).toEqual(new Date(1630685352000));
    });

});
