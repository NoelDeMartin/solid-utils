import type { JsonLD } from '@/helpers/jsonld';
import { pull } from '@noeldemartin/utils';
import type { Quad, Quad_Object } from 'rdf-js';

import { jsonldToQuads, quadToTurtle, quadsToTurtle, sparqlToQuadsSync, turtleToQuadsSync } from './io';

let patternsRegExpsIndex: Record<string, RegExp> = {};

function containsPatterns(value: string): boolean {
    return /\[\[(.*\]\[)?([^\]]+)\]\]/.test(value);
}

function quadValueEquals(expected: string, actual: string): boolean {
    if (!containsPatterns(expected))
        return expected === actual;

    const patternAliases = [];

    if (!(expected in patternsRegExpsIndex)) {
        const patternMatches = expected.matchAll(/\[\[((.*)\]\[)?([^\]]+)\]\]/g);
        const patterns: string[] = [];
        let expectedRegExp = expected;

        for (const patternMatch of patternMatches) {
            if (patternMatch[2]) {
                patternAliases.push(patternMatch[2]);
            }

            patterns.push(patternMatch[3]);

            expectedRegExp = expectedRegExp.replace(patternMatch[0], `%PATTERN${patterns.length - 1}%`);
        }

        expectedRegExp = expectedRegExp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        for (const [patternIndex, pattern] of Object.entries(patterns)) {
            expectedRegExp = expectedRegExp.replace(`%PATTERN${patternIndex}%`, pattern);
        }

        patternsRegExpsIndex[expected] = new RegExp(expectedRegExp);
    }

    return patternsRegExpsIndex[expected].test(actual);
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

    for (const expectedQuad of expectedQuads) {
        if (!actualQuads.some(actualQuad => quadEquals(expectedQuad, actualQuad)))
            return result(false, `Couldn't find the following triple: ${quadToTurtle(expectedQuad)}`);
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
    resetPatterns();

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
