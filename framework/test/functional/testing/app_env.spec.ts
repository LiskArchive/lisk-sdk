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
/* eslint-disable max-classes-per-file */
import { rmdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ApplicationEnv } from '../../../src/testing';
import { BaseMethod, BaseCommand, BaseEndpoint, BaseModule, TokenModule } from '../../../src';
import { ModuleMetadata } from '../../../src/modules/base_module';

const appLabel = 'beta-sdk-app';
const dataPath = join(homedir(), '.lisk', appLabel);

class SampleCommand extends BaseCommand {
	public name = 'asset';
	public id = 0;
	public schema = {
		$id: '/lisk/sample',
		type: 'object',
		properties: {},
	};
	public async execute(): Promise<void> {}
}
class SampleModule extends BaseModule {
	public name = 'SampleModule';
	public id = 999999;
	public method = {} as BaseMethod;
	public endpoint = {} as BaseEndpoint;
	public commands = [new SampleCommand(this.id)];
	public metadata(): ModuleMetadata {
		return {
			assets: [],
			commands: [],
			endpoints: [],
			events: [],
		};
	}
}

describe('Application Environment', () => {
	let appEnv: ApplicationEnv;
	let exitMock: jest.SpyInstance;

	beforeEach(() => {
		exitMock = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
	});

	afterEach(async () => {
		await appEnv.stopApplication();
		exitMock.mockRestore();
	});

	describe('Get Application Environment', () => {
		it('should return valid environment for empty modules', async () => {
			appEnv = new ApplicationEnv({ modules: [], config: { label: appLabel } });
			await appEnv.startApplication();

			expect(appEnv.application).toBeDefined();
			expect(appEnv.ipcClient).toBeDefined();
			expect(appEnv.dataPath).toBeDefined();
			expect(appEnv.lastBlock).toBeDefined();
			expect(appEnv.chainID).toBeDefined();
		});

		it('should return valid environment with custom module', async () => {
			appEnv = new ApplicationEnv({ modules: [new TokenModule()], config: { label: appLabel } });
			await appEnv.startApplication();

			expect(appEnv.application).toBeDefined();
			expect(appEnv.ipcClient).toBeDefined();
			expect(appEnv.dataPath).toBeDefined();
			expect(appEnv.lastBlock).toBeDefined();
			expect(appEnv.chainID).toBeDefined();
			expect(appEnv.application.getRegisteredModules().map(m => m.name)).toContainValues(['token']);
		});

		it('should return valid environment with custom config', async () => {
			appEnv = new ApplicationEnv({
				modules: [],
				plugins: [],
			});

			await appEnv.startApplication();

			expect(appEnv.application).toBeDefined();
			expect(appEnv.ipcClient).toBeDefined();
			expect(appEnv.dataPath).toBeDefined();
			expect(appEnv.lastBlock).toBeDefined();
			expect(appEnv.chainID).toBeDefined();
		});

		it('should start application and forge next block', async () => {
			appEnv = new ApplicationEnv({
				modules: [],
				plugins: [],
			});

			await appEnv.startApplication();
			await appEnv.waitNBlocks(1);

			expect(appEnv.lastBlock.header.height).toBeGreaterThan(0);
		});

		it('should start application with custom module', async () => {
			appEnv = new ApplicationEnv({
				modules: [new TokenModule(), new SampleModule()],
				plugins: [],
			});

			await appEnv.startApplication();
			await appEnv.waitNBlocks(1);

			expect(appEnv.lastBlock.header.height).toBeGreaterThan(0);
		});
	});
});
