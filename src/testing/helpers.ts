import { JSError, arrayRemove, pull, stringMatchAll } from '@noeldemartin/utils';
import type { Quad, Quad_Object } from '@rdfjs/types';

import {
    jsonldToQuads,
    quadToTurtle,
    quadsToTurtle,
    sparqlToQuadsSync,
    turtleToQuadsSync,
} from '@noeldemartin/solid-utils/helpers/rdf';
import type { JsonLD } from '@noeldemartin/solid-utils/helpers/jsonld';

let patternsRegExpsIndex: Record<string, RegExp> = {};
const builtInPatterns: Record<string, string> = {
    '%uuid%': '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
};

class ExpectedQuadAssertionError extends JSError {

    constructor(public readonly expectedQuad: Quad) {
        super(`Couldn't find the following triple: ${quadToTurtle(expectedQuad)}`);
    }

}

function assertExpectedQuadsExist(expectedQuads: Quad[], actualQuads: Quad[]): void {
    for (const expectedQuad of expectedQuads) {
        const matchingQuad = actualQuads.find((actualQuad) => quadEquals(expectedQuad, actualQuad));

        if (!matchingQuad) throw new ExpectedQuadAssertionError(expectedQuad);

        arrayRemove(actualQuads, matchingQuad);
    }
}

function containsPatterns(value: string): boolean {
    return /\[\[(.*\]\[)?([^\]]+)\]\]/.test(value);
}

function createPatternRegexp(expected: string): RegExp {
    const patternAliases = [];
    const patternMatches = stringMatchAll<4, 1 | 2>(expected, /\[\[((.*?)\]\[)?([^\]]+)\]\]/g);
    const patterns: string[] = [];
    let expectedRegExp = expected;

    for (const patternMatch of patternMatches) {
        patternMatch[2] && patternAliases.push(patternMatch[2]);

        patterns.push(patternMatch[3]);

        expectedRegExp = expectedRegExp.replace(patternMatch[0], `%PATTERN${patterns.length - 1}%`);
    }

    expectedRegExp = expectedRegExp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    for (const [patternIndex, pattern] of Object.entries(patterns)) {
        expectedRegExp = expectedRegExp.replace(`%PATTERN${patternIndex}%`, builtInPatterns[pattern] ?? pattern);
    }

    return new RegExp(expectedRegExp);
}

function quadValueEquals(expected: string, actual: string): boolean {
    return containsPatterns(expected)
        ? (patternsRegExpsIndex[expected] ??= createPatternRegexp(expected)).test(actual)
        : expected === actual;
}

function quadObjectEquals(expected: Quad_Object, actual: Quad_Object): boolean {
    if (expected.termType !== actual.termType) return false;

    if (expected.termType === 'Literal' && actual.termType === 'Literal') {
        if (expected.datatype.value !== actual.datatype.value) return false;

        if (!containsPatterns(expected.value))
            return expected.datatype.value === 'http://www.w3.org/2001/XMLSchema#dateTime'
                ? new Date(expected.value).getTime() === new Date(actual.value).getTime()
                : expected.value === actual.value;
    }

    return quadValueEquals(expected.value, actual.value);
}

function quadEquals(expected: Quad, actual: Quad): boolean {
    return (
        quadObjectEquals(expected.object, actual.object) &&
        quadValueEquals(expected.subject.value, actual.subject.value) &&
        quadValueEquals(expected.predicate.value, actual.predicate.value)
    );
}

function resetPatterns(): void {
    patternsRegExpsIndex = {};
}

export interface EqualityResult {
    success: boolean;
    message: string;
    expected: string;
    actual: string;
}

export async function jsonldEquals(expected: JsonLD, actual: JsonLD): Promise<EqualityResult> {
    // TODO catch parsing errors and improve message.
    resetPatterns();

    const expectedQuads = await jsonldToQuads(expected);
    const actualQuads = await jsonldToQuads(actual);
    const expectedTurtle = quadsToTurtle(expectedQuads);
    const actualTurtle = quadsToTurtle(actualQuads);
    const result = (success: boolean, message: string) => ({
        success,
        message,
        expected: expectedTurtle,
        actual: actualTurtle,
    });

    if (expectedQuads.length !== actualQuads.length)
        return result(false, `Expected ${expectedQuads.length} triples, found ${actualQuads.length}.`);

    try {
        assertExpectedQuadsExist(expectedQuads, actualQuads);
    } catch (error) {
        if (!(error instanceof ExpectedQuadAssertionError)) throw error;

        return result(false, error.message);
    }

    return result(true, 'jsonld matches');
}

export function sparqlEquals(expected: string, actual: string): EqualityResult {
    // TODO catch parsing errors and improve message.
    resetPatterns();

    const expectedOperations = sparqlToQuadsSync(expected, { normalizeBlankNodes: true });
    const actualOperations = sparqlToQuadsSync(actual, { normalizeBlankNodes: true });
    const result = (success: boolean, message: string) => ({ success, message, expected, actual });

    for (const operation of Object.keys(expectedOperations)) {
        if (!(operation in actualOperations)) return result(false, `Couldn't find expected ${operation} operation.`);

        const expectedQuads = pull(expectedOperations, operation);
        const actualQuads = pull(actualOperations, operation);

        if (expectedQuads.length !== actualQuads.length)
            return result(false, `Expected ${expectedQuads.length} ${operation} triples, found ${actualQuads.length}.`);

        try {
            assertExpectedQuadsExist(expectedQuads, actualQuads);
        } catch (error) {
            if (!(error instanceof ExpectedQuadAssertionError)) throw error;

            return result(
                false,
                `Couldn't find the following ${operation} triple: ${quadToTurtle(error.expectedQuad)}`,
            );
        }
    }

    const unexpectedOperation = Object.keys(actualOperations)[0] ?? null;
    if (unexpectedOperation) return result(false, `Did not expect to find ${unexpectedOperation} triples.`);

    return result(true, 'sparql matches');
}

export function turtleEquals(expected: string, actual: string): EqualityResult {
    // TODO catch parsing errors and improve message.
    resetPatterns();

    const expectedQuads = turtleToQuadsSync(expected, { normalizeBlankNodes: true });
    const actualQuads = turtleToQuadsSync(actual, { normalizeBlankNodes: true });
    const result = (success: boolean, message: string) => ({ success, message, expected, actual });

    if (expectedQuads.length !== actualQuads.length)
        return result(false, `Expected ${expectedQuads.length} triples, found ${actualQuads.length}.`);

    try {
        assertExpectedQuadsExist(expectedQuads, actualQuads);
    } catch (error) {
        if (!(error instanceof ExpectedQuadAssertionError)) throw error;

        return result(false, error.message);
    }

    return result(true, 'turtle matches');
}
