import { describe, expect, it } from 'vitest';
import { expandIRI } from '@noeldemartin/solid-utils/helpers/vocabs';

describe('Vocab helpers', () => {

    it('expands IRIs', async () => {
        expect(expandIRI('solid:privateTypeIndex')).toBe('http://www.w3.org/ns/solid/terms#privateTypeIndex');
        expect(expandIRI('http://example.com/')).toBe('http://example.com/');
        expect(expandIRI('solid://anonymous')).toBe('solid://anonymous');
    });

});
