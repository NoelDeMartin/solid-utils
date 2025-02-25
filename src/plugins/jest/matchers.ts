import { normalizeSparql, normalizeTurtle } from '@/helpers/io';
import { jsonldEquals, sparqlEquals, turtleEquals } from '@/helpers/testing';
import type { EqualityResult } from '@/helpers/testing';

interface FormatResultOptions {
    context: jest.MatcherContext;
    hint: string;
    expected: unknown;
    received: unknown;
}

function formatResult(result: EqualityResult, options: FormatResultOptions) {
    const pass = result.success;
    const utils = options.context.utils;
    const message = pass
        ? () => [
            result.message,
            utils.matcherHint(options.hint),
        ].join('\n\n')
        : () => [
            result.message,
            utils.matcherHint(options.hint),
            [
                `Expected: not ${utils.printExpected(options.expected)}`,
                `Received: ${utils.printReceived(options.received)}`,
            ].join('\n'),
        ].join('\n\n');

    return { pass, message };
}

const matchers: jest.ExpectExtendMap = {
    async toEqualJsonLD(received, expected) {
        const result = await jsonldEquals(expected, received);

        return formatResult(result, {
            context: this,
            hint: 'toEqualJsonLD',
            expected,
            received,
        });
    },
    toEqualSparql(received, expected) {
        const result = sparqlEquals(expected, received);

        return formatResult(result, {
            context: this,
            hint: 'toEqualSparql',
            expected: normalizeSparql(expected),
            received: normalizeSparql(received),
        });
    },
    toEqualTurtle(received, expected) {
        const result = turtleEquals(expected, received);

        return formatResult(result, {
            context: this,
            hint: 'toEqualTurtle',
            expected: normalizeTurtle(expected),
            received: normalizeTurtle(received),
        });
    },
};

export default matchers;
