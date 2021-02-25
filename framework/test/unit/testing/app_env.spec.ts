/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import { APIClient } from '@liskhq/lisk-api-client';
import { rmdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getApplicationEnv } from '../../../src/testing';
import { Application, PartialApplicationConfig, TokenModule, DPoSModule } from '../../../src';
import { clearApplicationEnv } from '../../../src/testing/app_env';
import { defaultConfig } from '../../../src/testing/fixtures';

const appLabel = 'beta-sdk-app';
const dataPath = join(homedir(), '.lisk', appLabel);

describe('Application Environment', () => {
	interface ApplicationEnv {
		apiClient: Promise<APIClient>;
		application: Application;
	}
	let appEnv: ApplicationEnv;
	let exitMock: jest.SpyInstance;

	beforeEach(() => {
		exitMock = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
	});

	afterEach(async () => {
		await clearApplicationEnv(appEnv);
		exitMock.mockRestore();
	});

	describe('Get Application Environment', () => {
		it('should return valid environment for empty modules', async () => {
			appEnv = await getApplicationEnv({ modules: [] });

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});

		it('should return valid environment with custom module', async () => {
			appEnv = await getApplicationEnv({ modules: [TokenModule, DPoSModule] });

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});

		it('should return valid environment with custom config', async () => {
			appEnv = await getApplicationEnv({
				modules: [],
				plugins: [],
				config: defaultConfig as PartialApplicationConfig,
			});

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});
	});
});
