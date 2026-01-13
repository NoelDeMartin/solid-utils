import { describe, expect, it } from 'vitest';

import {
    jsonldToQuads,
    normalizeJsonLD,
    normalizeSparql,
    quadsToJsonLD,
    sparqlToQuadsSync,
    turtleToQuadsSync,
} from './rdf';
import type { Quad } from '@rdfjs/types';

describe('RDF', () => {

    it('parses jsonld', async () => {
        // Arrange
        const jsonld = {
            '@context': { '@vocab': 'https://schema.org/' },
            '@type': 'Movie',
            'name': 'Spirited Away',
        };

        // Act
        const quads = (await jsonldToQuads(jsonld)) as [Quad, Quad];

        // Assert
        expect(quads).toHaveLength(2);

        expect(quads[0].subject.termType).toEqual('BlankNode');
        expect(quads[0].predicate.termType).toEqual('NamedNode');
        expect(quads[0].predicate.value).toEqual('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        expect(quads[0].object.termType).toEqual('NamedNode');
        expect(quads[0].object.value).toEqual('https://schema.org/Movie');

        expect(quads[1].subject.termType).toEqual('BlankNode');
        expect(quads[1].predicate.termType).toEqual('NamedNode');
        expect(quads[1].predicate.value).toEqual('https://schema.org/name');
        expect(quads[1].object.termType).toEqual('Literal');
        expect(quads[1].object.value).toEqual('Spirited Away');
    });

    it('parses jsonld with anonymous subjects', async () => {
        // Arrange
        const jsonld = {
            '@context': { '@vocab': 'https://schema.org/' },
            '@id': '#it',
            '@type': 'Movie',
            'name': 'Spirited Away',
        };

        // Act
        const quads = (await jsonldToQuads(jsonld)) as [Quad, Quad];

        // Assert
        expect(quads).toHaveLength(2);

        expect(quads[0].subject.termType).toEqual('NamedNode');
        expect(quads[0].subject.value).toEqual('#it');
        expect(quads[0].predicate.termType).toEqual('NamedNode');
        expect(quads[0].predicate.value).toEqual('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        expect(quads[0].object.termType).toEqual('NamedNode');
        expect(quads[0].object.value).toEqual('https://schema.org/Movie');

        expect(quads[1].subject.termType).toEqual('NamedNode');
        expect(quads[1].subject.value).toEqual('#it');
        expect(quads[1].predicate.termType).toEqual('NamedNode');
        expect(quads[1].predicate.value).toEqual('https://schema.org/name');
        expect(quads[1].object.termType).toEqual('Literal');
        expect(quads[1].object.value).toEqual('Spirited Away');
    });

    it('parses jsonld graphs', async () => {
        // Arrange
        const jsonld = {
            '@graph': [
                {
                    '@context': { '@vocab': 'https://schema.org/' },
                    '@id': 'solid://movies/spirited-away',
                    '@type': 'Movie',
                    'name': 'Spirited Away',
                },
                {
                    '@context': { '@vocab': 'https://schema.org/' },
                    '@id': 'solid://movies/spirited-away',
                    '@type': 'Movie',
                    'name': 'Spirited Away',
                },
            ],
        };

        // Act
        const quads = await jsonldToQuads(jsonld);

        // Assert
        expect(quads).toHaveLength(4);

        [0, 2].forEach((index) => {
            expect(quads[index]?.subject.termType).toEqual('NamedNode');
            expect(quads[index]?.subject.value).toEqual('solid://movies/spirited-away');
            expect(quads[index]?.predicate.termType).toEqual('NamedNode');
            expect(quads[index]?.predicate.value).toEqual('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
            expect(quads[index]?.object.termType).toEqual('NamedNode');
            expect(quads[index]?.object.value).toEqual('https://schema.org/Movie');
        });

        [1, 3].forEach((index) => {
            expect(quads[index]?.subject.termType).toEqual('NamedNode');
            expect(quads[index]?.subject.value).toEqual('solid://movies/spirited-away');
            expect(quads[index]?.predicate.termType).toEqual('NamedNode');
            expect(quads[index]?.predicate.value).toEqual('https://schema.org/name');
            expect(quads[index]?.object.termType).toEqual('Literal');
            expect(quads[index]?.object.value).toEqual('Spirited Away');
        });
    });

    it('normalizes sparql', () => {
        // Arrange
        const insertTurtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me>
                foaf:name "Amy" ;
                foaf:lastName "Doe" .
        `;
        const deleteTurtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me> foaf:name "John Doe" .
        `;
        const sparql = `
            INSERT DATA { ${insertTurtle} } ;
            DELETE DATA { ${deleteTurtle} }
        `;

        // Act
        const normalized = normalizeSparql(sparql);

        // Assert
        expect(normalized).toEqual(
            [
                'INSERT DATA {',
                '    <#me> <http://xmlns.com/foaf/0.1/lastName> "Doe" .',
                '    <#me> <http://xmlns.com/foaf/0.1/name> "Amy" .',
                '} ;',
                'DELETE DATA {',
                '    <#me> <http://xmlns.com/foaf/0.1/name> "John Doe" .',
                '}',
            ].join('\n'),
        );
    });

    it('parses sparql', () => {
        // Arrange
        const insertTurtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me> foaf:name "Amy Doe" .
        `;
        const deleteTurtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me> foaf:name "John Doe" .
        `;
        const sparql = `
            INSERT DATA { ${insertTurtle} } ;
            DELETE DATA { ${deleteTurtle} }
        `;

        // Act
        const quads = sparqlToQuadsSync(sparql);

        // Assert
        expect(Object.keys(quads)).toHaveLength(2);

        expect(quads.insert).toEqual(turtleToQuadsSync(insertTurtle));
        expect(quads.delete).toEqual(turtleToQuadsSync(deleteTurtle));
    });

    it('parses turtle synchronously', () => {
        // Arrange
        const turtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me>
                a foaf:Person ;
                foaf:name "John Doe" .
        `;

        // Act
        const quads = turtleToQuadsSync(turtle) as [Quad, Quad];

        // Assert
        expect(quads).toHaveLength(2);

        expect(quads[0].subject.termType).toEqual('NamedNode');
        expect(quads[0].subject.value).toEqual('#me');
        expect(quads[0].predicate.termType).toEqual('NamedNode');
        expect(quads[0].predicate.value).toEqual('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        expect(quads[0].object.termType).toEqual('NamedNode');
        expect(quads[0].object.value).toEqual('http://xmlns.com/foaf/0.1/Person');

        expect(quads[1].subject.termType).toEqual('NamedNode');
        expect(quads[1].subject.value).toEqual('#me');
        expect(quads[1].predicate.termType).toEqual('NamedNode');
        expect(quads[1].predicate.value).toEqual('http://xmlns.com/foaf/0.1/name');
        expect(quads[1].object.termType).toEqual('Literal');
        expect(quads[1].object.value).toEqual('John Doe');
    });

    it('normalizes jsonld', async () => {
        // Arrange
        const json = {
            '@graph': [
                {
                    '@context': { '@vocab': 'https://schema.org/' },
                    '@id': '#it',
                    '@type': 'Movie',
                    'name': 'Spirited Away',
                },
                {
                    '@context': { '@vocab': 'https://vocab.noeldemartin.com/crdt/' },
                    '@id': '#it-metadata',
                    '@type': 'Metadata',
                    'resource': { '@id': '#it' },
                },
            ],
        };

        const clone = structuredClone(json);

        // Act
        const normalized = await normalizeJsonLD(json);

        // Assert
        expect(json).toEqual(clone);
        expect(normalized).toEqual({
            '@graph': [
                {
                    '@id': '#it',
                    '@type': ['https://schema.org/Movie'],
                    'https://schema.org/name': [{ '@value': 'Spirited Away' }],
                },
                {
                    '@id': '#it-metadata',
                    '@type': ['https://vocab.noeldemartin.com/crdt/Metadata'],
                    'https://vocab.noeldemartin.com/crdt/resource': [{ '@id': '#it' }],
                },
            ],
        });
    });

    it('converts quads to jsonld', async () => {
        // Arrange
        const quads = turtleToQuadsSync(`
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me>
                a foaf:Person ;
                foaf:name "John Doe" .
        `);

        // Act
        const jsonld = await quadsToJsonLD(quads);

        // Assert
        expect(jsonld).toEqual({
            '@graph': [
                {
                    '@id': '#me',
                    '@type': ['http://xmlns.com/foaf/0.1/Person'],
                    'http://xmlns.com/foaf/0.1/name': [{ '@value': 'John Doe' }],
                },
            ],
        });
    });

});
