import diff from 'jest-diff';

import { normalizeSparql, sparqlEquals } from '@/lib/index';

const matchers: jest.ExpectExtendMap = {
    toEqualSparql(received, expected) {
        const result = sparqlEquals(expected, received);
        const pass = result.success;
        const normalizedReceived = normalizeSparql(received);
        const normalizedExpected = normalizeSparql(expected);
        const message = pass
            ? () => [
                result.message,
                this.utils.matcherHint('toEqualSparql'),
                [
                    `Expected: not ${this.utils.printExpected(normalizedExpected)}`,
                    `Received: ${this.utils.printReceived(normalizedReceived)}`,
                ].join('\n'),
            ].join('\n\n')
            : () => {
                const diffString = diff(normalizedExpected, normalizedReceived, {
                    expand: this.expand,
                });

                return [
                    result.message,
                    this.utils.matcherHint('toEqualJsonLD'),
                    diffString && diffString.includes('- Expect')
                        ? `Difference:\n\n${diffString}`
                        : [
                            `Expected: ${this.utils.printExpected(normalizedExpected)}`,
                            `Received: ${this.utils.printReceived(normalizedReceived)}`,
                        ].join('\n'),
                ].join('\n\n');
            };

        return { pass, message };
    },
};

export default matchers;
