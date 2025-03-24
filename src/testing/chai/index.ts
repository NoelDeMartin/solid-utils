import assertions from './assertions';

export function installChaiPlugin(): void {
    (globalThis as { chai?: Chai.ChaiStatic }).chai?.use((_chai) => {
        return Object.entries(assertions).forEach(([name, method]) => _chai.Assertion.addMethod(name, method));
    });
}
