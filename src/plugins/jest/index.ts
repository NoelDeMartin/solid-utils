import matchers from './matchers';

export function installJestPlugin(): void {
    expect.extend(matchers);
}
