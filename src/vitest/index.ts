import { expect } from 'vitest';

import matchers from './matchers';

export type VitestSolidMatchers<R = void> = {
    [K in keyof typeof matchers]: (
        // oxlint-disable-next-line typescript/no-explicit-any
        ...args: Parameters<(typeof matchers)[K]> extends [any, ...infer Rest] ? Rest : never
    ) => ReturnType<(typeof matchers)[K]> extends Promise<unknown> ? Promise<void> : R;
};

export function installVitestSolidMatchers(): void {
    expect.extend(matchers);
}

declare module 'vitest' {
    interface Matchers<
        R extends void | Promise<void> = void | Promise<void>,
        T = unknown,
    > extends VitestSolidMatchers<R> {}
}
