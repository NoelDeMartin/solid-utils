import type { MatcherState, MatchersObject } from '@vitest/expect';

import { normalizeSparql, normalizeTurtle } from '@noeldemartin/solid-utils/helpers/rdf';
import { jsonldEquals, sparqlEquals, turtleEquals } from '@noeldemartin/solid-utils/testing/helpers';
import type { EqualityResult } from '@noeldemartin/solid-utils/testing/helpers';
import type { JsonLD } from '@noeldemartin/solid-utils/helpers';

interface FormatResultOptions {
    state: MatcherState;
    hint: string;
    expected: unknown;
    received: unknown;
}

function formatResult(result: EqualityResult, options: FormatResultOptions) {
    const pass = result.success;
    const utils = options.state.utils;
    const message = pass
        ? () => [result.message, utils.matcherHint(options.hint)].join('\n\n')
        : () =>
            [
                result.message,
                utils.matcherHint(options.hint),
                [
                    `Expected: not ${utils.printExpected(options.expected)}`,
                    `Received: ${utils.printReceived(options.received)}`,
                ].join('\n'),
            ].join('\n\n');

    return { pass, message };
}

export function defineMatchers<T extends MatchersObject>(matchers: T): T {
    return matchers;
}

export default defineMatchers({
    async toEqualJsonLD(received, expected: JsonLD) {
        const result = await jsonldEquals(expected, received);

        return formatResult(result, {
            state: this,
            hint: 'toEqualJsonLD',
            expected,
            received,
        });
    },
    toEqualSparql(received, expected: string) {
        const result = sparqlEquals(expected, received);

        return formatResult(result, {
            state: this,
            hint: 'toEqualSparql',
            expected: normalizeSparql(expected),
            received: normalizeSparql(received),
        });
    },
    toEqualTurtle(received, expected: string) {
        const result = turtleEquals(expected, received);

        return formatResult(result, {
            state: this,
            hint: 'toEqualTurtle',
            expected: normalizeTurtle(expected),
            received: normalizeTurtle(received),
        });
    },
});
