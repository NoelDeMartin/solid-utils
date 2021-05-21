import { sparqlEquals } from '@/lib';

// TODO generate types
export interface JestMatchers<R> {
    toEqualSparql(sparql: string): R;
}

export function extendJest(expect: jest.Expect): void {
    expect.extend({
        toEqualSparql(received, expected) {
            const result = sparqlEquals(expected, received);

            return {
                pass: result.success,

                // TODO configure message using matcher utils
                message: () => result.message,
            };
        },
    });
}
