import { expect } from 'vitest';

import matchers from './matchers';

export type VitestSolidMatchers<R = unknown> = {
    [K in keyof typeof matchers]: (
        ...args: Parameters<(typeof matchers)[K]> extends [any, ...infer Rest] ? Rest : never
    ) => ReturnType<(typeof matchers)[K]> extends Promise<any> ? Promise<R> : R;
};

export function installVitestSolidMatchers(): void {
    expect.extend(matchers);
}
