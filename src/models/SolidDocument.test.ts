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

});
