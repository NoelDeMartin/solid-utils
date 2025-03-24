import { sparqlEquals, turtleEquals } from '@noeldemartin/solid-utils/testing/helpers';
import type { EqualityResult } from '@noeldemartin/solid-utils/testing/helpers';

export function defineChaiAssertions<T extends Record<string, (this: Chai.AssertionStatic, ...args: any[]) => void>>(
    assertions: T): T {
    return assertions;
}

export default defineChaiAssertions({
    turtle(graph: string): void {
        const self = this as unknown as Chai.AssertionStatic;
        const actual = self._obj as string;
        const assert = self.assert.bind(this);
        const expected = graph;
        const result = turtleEquals(expected, actual);

        assert(result.success, result.message, '', result.expected, result.actual);
    },
    sparql(query: string): void {
        const self = this as unknown as Chai.AssertionStatic;
        const actual = self._obj as string;
        const assert = self.assert.bind(this);
        const expected = query;
        const result = sparqlEquals(expected, actual);

        assert(result.success, result.message, '', result.expected, result.actual);
    },
    equalityResult(): void {
        const self = this as unknown as Chai.AssertionStatic;
        const result = self._obj as EqualityResult;
        const assert = self.assert.bind(this);

        assert(result.success, result.message, '', result.expected, result.actual);
    },
});
