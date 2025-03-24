import assertions from './assertions';

export type ChaiSolidAssertions = {
    [assertion in keyof typeof assertions]: (typeof assertions)[assertion];
};

export function installChaiSolidAssertions(): void {
    (globalThis as { chai?: Chai.ChaiStatic }).chai?.use((_chai) => {
        return Object.entries(assertions).forEach(([name, method]) => _chai.Assertion.addMethod(name, method));
    });
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Chai {
        interface Assertion extends ChaiSolidAssertions {}
        interface Include extends ChaiSolidAssertions {}
    }
}
