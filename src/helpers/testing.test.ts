import { sparqlEquals, turtleEquals } from './testing';

describe('Testing', () => {

    it('Compares sparql', () => {
        // Arrange
        const expected = 'INSERT DATA { <#me> a <http://xmlns.com/foaf/0.1/Person> . }';
        const actual = 'INSERT DATA { <#me> a <http://xmlns.com/foaf/0.1/Person> . }';

        // Act
        const result = sparqlEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    it('Compares sparql operations', () => {
        // Arrange
        const expected = `
            INSERT DATA { <#me> <http://xmlns.com/foaf/0.1/name> "Amy Doe" . } ;
            DELETE DATA { <#me> <http://xmlns.com/foaf/0.1/name> "John Doe" . }
        `;
        const actual = 'INSERT DATA { <#me> <http://xmlns.com/foaf/0.1/name> "Amy Doe" . }';

        // Act
        const result = sparqlEquals(expected, actual);

        // Assert
        expect(result.success).toBe(false);
    });

    it('Compares sparql triples', () => {
        // Arrange
        const expected = 'INSERT DATA { <#me> a <http://xmlns.com/foaf/0.1/Person> . }';
        const actual = 'INSERT DATA { <#me> <http://xmlns.com/foaf/0.1/name> "Amy Doe" . }';

        // Act
        const result = sparqlEquals(expected, actual);

        // Assert
        expect(result.success).toBe(false);
    });

    it('Compares expanded ordered lists in Turtle', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient ( "Broth" "Noodles" ) .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .
            @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient _:b0 .

            _:b0
                rdf:first "Broth" ;
                rdf:rest _:b1 .

            _:b1
                rdf:first "Noodles" ;
                rdf:rest rdf:nil .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    it('Compares different ordered lists in Turtle', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient ( "Broth" "Noodles" ) .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient ( "Noodles" "Broth" ) .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(false);
    });

    it('Compares different unordered lists in Turtle', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient "Broth", "Noodles" .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeIngredient "Noodles", "Broth" .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    it('Compares sparql using regex patterns', () => {
        // Arrange
        const expected = `
            INSERT DATA {
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
                @prefix foaf: <http://xmlns.com/foaf/> .
                @prefix purl: <http://purl.org/dc/terms/> .

                <#me>
                    foaf:name "[[.*]] Doe" ;
                    foaf:age 42 .

                <#something-[[.*]]>
                    purl:created "[[.*]]"^^xsd:dateTime ;
                    purl:modified "2021-01-16T[[.*]]"^^xsd:dateTime ;
                    purl:available "2021-01-16T12:34:56Z"^^xsd:dateTime .
            }
        `;
        const actual = `
            INSERT DATA {
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
                @prefix foaf: <http://xmlns.com/foaf/> .
                @prefix purl: <http://purl.org/dc/terms/> .

                <#me>
                    foaf:name "John Doe" ;
                    foaf:age 42 .

                <#something-123456>
                    purl:created "2021-01-16T12:12:50.123Z"^^xsd:dateTime ;
                    purl:modified "2021-01-16T12:12:50.123Z"^^xsd:dateTime ;
                    purl:available "2021-01-16T12:34:56.000Z"^^xsd:dateTime .
            }
        `;

        // Act
        const result = sparqlEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

});
