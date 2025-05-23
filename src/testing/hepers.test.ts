import { describe, expect, it } from 'vitest';

import { sparqlEquals, turtleEquals } from './helpers';

describe('Testing helpers', () => {

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

    it('supports aliases in regex patterns', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeInstructions <#[[step-1][.*]]>, <#[[step-2][.*]]> .

            <#[[step-1][.*]]>
                a schema:HowToStep ;
                schema:text "Boil the noodles" .

            <#[[step-2][.*]]>
                a schema:HowToStep ;
                schema:text "Dip them into the broth" .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeInstructions <#ramen-step-1>, <#ramen-step-2> .

            <#ramen-step-1>
                a schema:HowToStep ;
                schema:text "Boil the noodles" .

            <#ramen-step-2>
                a schema:HowToStep ;
                schema:text "Dip them into the broth" .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    it('counts matching triples only once', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen", "Ramen" .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:description "is life" .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(false);
    });

    it('allows regex patterns to be mixed up', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#[[instruction-1][.*]]-operation-[[operation-1][.*]]> schema:object <#[[instruction-1][.*]]> .
            <#[[instruction-1][.*]]-metadata> schema:object <#[[instruction-1][.*]]> .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen-step-1-metadata> schema:object <#ramen> .
            <#ramen-step-1-operation-1> schema:object <#ramen> .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    it('matches built-in patterns', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#[[foobar][%uuid%]]> schema:description "Lorem ipsum" .
            <#[[%uuid%]]> schema:description "Dolor sit amet" .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#20421db7-0c7d-419c-b27e-2c9b3cc026b3> schema:description "Lorem ipsum" .
            <#d4b41533-dd5d-4a66-9d3f-316f80f135b2> schema:description "Dolor sit amet" .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(true);
    });

    // TODO
    it.skip('aliases match regex patterns', () => {
        // Arrange
        const expected = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeInstructions <#[[step-1][.*]]>, <#[[step-2][.*]]> .

            <#[[step-1][.*]]>
                a schema:HowToStep ;
                schema:text "Boil the noodles" .

            <#[[step-2][.*]]>
                a schema:HowToStep ;
                schema:text "Dip them into the broth" .
        `;
        const actual = `
            @prefix schema: <https://schema.org/> .

            <#ramen>
                a schema:Recipe ;
                schema:name "Ramen" ;
                schema:recipeInstructions <#ramen-step-1>, <#ramen-step-2> .

            <#ramen-step-1>
                a schema:HowToStep ;
                schema:text "Boil the noodles" .

            <#ramen-step-3>
                a schema:HowToStep ;
                schema:text "Dip them into the broth" .
        `;

        // Act
        const result = turtleEquals(expected, actual);

        // Assert
        expect(result.success).toBe(false);
    });

});
