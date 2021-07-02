import { normalizeSparql, sparqlToQuadsSync, turtleToQuadsSync } from './io';

describe('IO', () => {

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
        expect(normalized).toEqual([
            'INSERT DATA {',
            '    <#me> <http://xmlns.com/foaf/0.1/lastName> "Doe" .',
            '    <#me> <http://xmlns.com/foaf/0.1/name> "Amy" .',
            '} ;',
            'DELETE DATA {',
            '    <#me> <http://xmlns.com/foaf/0.1/name> "John Doe" .',
            '}',
        ].join('\n'));
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
        const quads = turtleToQuadsSync(turtle);

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
