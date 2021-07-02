import { pull } from '@noeldemartin/utils';
import type { Quad, Quad_Object } from 'rdf-js';

import { quadToTurtle, sparqlToQuadsSync, turtleToQuadsSync } from './io';

const patternRegExps: Record<string, RegExp> = {};

function containsPatterns(value: string): boolean {
    return /\[\[([^\]]+)\]\]/.test(value);
}

function quadValueEquals(expected: string, actual: string): boolean {
    if (!containsPatterns(expected))
        return expected === actual;

    if (!(expected in patternRegExps)) {
        const patternMatches = expected.matchAll(/\[\[([^\]]+)\]\]/g);
        const patterns: string[] = [];
        let expectedRegExp = expected;

        for (const patternMatch of patternMatches) {
            patterns.push(patternMatch[1]);

            expectedRegExp = expectedRegExp.replace(patternMatch[0], `%PATTERN${patterns.length - 1}%`);
        }

        expectedRegExp = expectedRegExp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        for (const [patternIndex, pattern] of Object.entries(patterns)) {
            expectedRegExp = expectedRegExp.replace(`%PATTERN${patternIndex}%`, pattern);
        }

        patternRegExps[expected] = new RegExp(expectedRegExp);
    }

    return patternRegExps[expected].test(actual);
}

function quadObjectEquals(expected: Quad_Object, actual: Quad_Object): boolean {
    if (expected.termType !== actual.termType)
        return false;

    if (expected.termType === 'Literal' && actual.termType === 'Literal') {
        if (expected.datatype.value !== actual.datatype.value)
            return false;

        if (!containsPatterns(expected.value))
            return expected.datatype.value === 'http://www.w3.org/2001/XMLSchema#dateTime'
                ? new Date(expected.value).getTime() === new Date(actual.value).getTime()
                : expected.value === actual.value;
    }

    return quadValueEquals(expected.value, actual.value);
}

function quadEquals(expected: Quad, actual: Quad): boolean {
    return quadObjectEquals(expected.object, actual.object)
        && quadValueEquals(expected.subject.value, actual.subject.value)
        && quadValueEquals(expected.predicate.value, actual.predicate.value);
}

export interface EqualityResult {
    success: boolean;
    message: string;
    expected: string;
    actual: string;
}

export function sparqlEquals(expected: string, actual: string): EqualityResult {
    // TODO catch parsing errors and improve message.

    const expectedOperations = sparqlToQuadsSync(expected, { normalizeBlankNodes: true });
    const actualOperations = sparqlToQuadsSync(actual, { normalizeBlankNodes: true });
    const result = (success: boolean, message: string) => ({ success, message, expected, actual });

    for (const operation of Object.keys(expectedOperations)) {
        if (!(operation in actualOperations))
            return result(false, `Couldn't find expected ${operation} operation.`);

        const expectedQuads = pull(expectedOperations, operation);
        const actualQuads = pull(actualOperations, operation);

        if (expectedQuads.length !== actualQuads.length)
            return result(false, `Expected ${expectedQuads.length} ${operation} triples, found ${actualQuads.length}.`);

        for (const expectedQuad of expectedQuads) {
            if (!actualQuads.some(actualQuad => quadEquals(expectedQuad, actualQuad)))
                return result(false, `Couldn't find the following ${operation} triple: ${quadToTurtle(expectedQuad)}`);
        }
    }

    const unexpectedOperation = Object.keys(actualOperations)[0] ?? null;
    if (unexpectedOperation)
        return result(false, `Did not expect to find ${unexpectedOperation} triples.`);

    return result(true, 'sparql matches');
}

export function turtleEquals(expected: string, actual: string): EqualityResult {
    // TODO catch parsing errors and improve message.

    const expectedQuads = turtleToQuadsSync(expected, { normalizeBlankNodes: true });
    const actualQuads = turtleToQuadsSync(actual, { normalizeBlankNodes: true });
    const result = (success: boolean, message: string) => ({ success, message, expected, actual });

    if (expectedQuads.length !== actualQuads.length)
        return result(false, `Expected ${expectedQuads.length} triples, found ${actualQuads.length}.`);

    for (const expectedQuad of expectedQuads) {
        if (!actualQuads.some(actualQuad => quadEquals(expectedQuad, actualQuad)))
            return result(false, `Couldn't find the following triple: ${quadToTurtle(expectedQuad)}`);
    }

    return result(true, 'turtle matches');
}
