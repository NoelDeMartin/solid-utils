import { sparqlEquals } from '@/lib';

type CustomAssertions = {
    [assertion in keyof typeof assertions]: typeof assertions[assertion];
};

declare global {

    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Chai {

        interface Assertion extends CustomAssertions {}
        interface Include extends CustomAssertions {}

    }

}

const assertions: Record<string, (this: Chai.AssertionStatic, ...args: any[]) => void> = {
    sparql(query: string): void {
        const self = this as unknown as Chai.AssertionStatic;
        const actual = self._obj;
        const assert = self.assert.bind(this);
        const expected = query;
        const result = sparqlEquals(expected, actual);

        assert(result.success, result.message, expected, actual);
    },
};

export default assertions;
