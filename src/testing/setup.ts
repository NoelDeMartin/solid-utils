import { installVitestSolidMatchers } from '@noeldemartin/solid-utils/vitest';
import { FakeServer } from '@noeldemartin/testing';
import { beforeAll, beforeEach } from 'vite-plus/test';

beforeEach(() => FakeServer.reset());
beforeAll(() => installVitestSolidMatchers());
