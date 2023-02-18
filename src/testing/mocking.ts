import { fail } from '@noeldemartin/utils';
import type { GetClosureArgs, GetClosureResult } from '@noeldemartin/utils';

import type { Fetch } from '@/helpers/io';

import ResponseStub from './ResponseStub';

export interface FetchMockMethods {
    mockResponse(body?: string, headers?: Record<string, string>, status?: number): void;
    mockNotFoundResponse(): void;
}

export type FetchMock = jest.Mock<GetClosureResult<Fetch>, GetClosureArgs<Fetch>> & Fetch & FetchMockMethods;

export function mockFetch(): FetchMock {
    const responses: ResponseStub[] = [];
    const methods: FetchMockMethods = {
        mockResponse(body, headers, status) {
            responses.push(new ResponseStub(body, headers, status));
        },
        mockNotFoundResponse() {
            responses.push(new ResponseStub('', {}, 404));
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchMock = jest.fn(async (...args: GetClosureArgs<Fetch>) => {
        return responses.shift() ?? fail<Response>('fetch mock called without response');
    });

    Object.assign(fetchMock, methods);

    return fetchMock as FetchMock;
}
