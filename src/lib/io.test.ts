import { turtleToQuads } from '@/lib/io';

describe('IO', () => {

    it('parses turtle', () => {
        // Arrange
        const turtle = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .

            <#me>
                a foaf:Person ;
                foaf:name "John Doe" .
        `;

        // Act
        const quads = turtleToQuads(turtle);

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

});
