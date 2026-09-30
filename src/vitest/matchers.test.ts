import { installVitestSolidMatchers } from '@noeldemartin/solid-utils/vitest';
import { beforeAll, describe, expect, it } from 'vite-plus/test';

describe('Vitest matchers', () => {
    beforeAll(() => installVitestSolidMatchers());

    it('Compares turtle', () => {
        expect('<#me> a <http://xmlns.com/foaf/0.1/Person> .').toEqualTurtle(
            '<#me> a <http://xmlns.com/foaf/0.1/Person> .',
        );
        expect('<#me> a <http://xmlns.com/foaf/0.1/Person> .').not.toEqualTurtle(
            '<#me> a <http://xmlns.com/foaf/0.1/Agent> .',
        );
    });

    it('Compares sparql', () => {
        expect('INSERT DATA { <#me> a <http://xmlns.com/foaf/0.1/Person> . }').toEqualSparql(
            'INSERT DATA { <#me> a <http://xmlns.com/foaf/0.1/Person> . }',
        );
    });

    it('Compares JSON-LD', async () => {
        await expect({ '@id': '#me', '@type': 'http://xmlns.com/foaf/0.1/Person' }).toEqualJsonLD({
            '@id': '#me',
            '@type': 'http://xmlns.com/foaf/0.1/Person',
        });
    });

    it('Types matcher arguments', () => {
        // @ts-expect-error Turtle must be a string.
        expect(() => expect('').toEqualTurtle(42)).toThrow();
    });
});
