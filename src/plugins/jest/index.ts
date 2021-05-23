import matchers from './matchers';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toEqualSparql(sparql: string): R;
        }
    }
}

export function installJestPlugin(): void {
    expect.extend(matchers);
}
