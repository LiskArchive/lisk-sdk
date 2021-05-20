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
 *
 */
import { when } from 'jest-when';
import * as Config from '@oclif/config';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { Application } from 'lisk-framework';

import { StartCommand } from '../../../src/bootstrapping/commands/start';
import { getConfig } from '../../helpers/config';
import * as application from '../../helpers/application';
import * as devnetGenesisBlock from '../../fixtures/devnet/genesis_block.json';

import pJSON = require('../../../package.json');

// In order to test the command we need to extended the base crete command and provide application implementation
class StartCommandExtended extends StartCommand {
	static flags = {
		...StartCommand.flags,
	};
	public getApplication(): Application {
		const app = application.getApplication();
		jest.spyOn(app, 'run').mockResolvedValue();
		return app;
	}

	public getApplicationConfigDir(): string {
		return '/my/custom/app';
	}
}

describe('start', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		const app = application.getApplication();
		jest.spyOn(app, 'run').mockResolvedValue();
		jest.spyOn(StartCommandExtended.prototype, 'getApplication').mockReturnValue(app);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(application, 'getApplication').mockReturnValue({
			run: async () => Promise.resolve(),
		} as Application);
		jest.spyOn(fs, 'readJSON');
		when(fs.readJSON as jest.Mock)
			.calledWith('~/.lisk/lisk-core/config/default/config.json')
			.mockResolvedValue({
				logger: {
					consoleLogLevel: 'error',
				},
				plugins: {},
			})
			.calledWith('~/.lisk/lisk-core/config/devnet/config.json')
			.mockResolvedValue({
				logger: {
					consoleLogLevel: 'error',
				},
				plugins: {},
			})
			.calledWith('~/.lisk/lisk-core/config/default/genesis_block.json')
			.mockResolvedValue(devnetGenesisBlock)
			.calledWith('~/.lisk/lisk-core/config/devnet/genesis_block.json')
			.mockResolvedValue(devnetGenesisBlock);
		jest.spyOn(fs, 'readdirSync');
		when(fs.readdirSync as jest.Mock)
			.mockReturnValue(['default'])
			.calledWith(path.join(__dirname, '../../config'))
			.mockReturnValue(['default', 'devnet']);

		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'removeSync').mockReturnValue();
		jest.spyOn(fs, 'copyFileSync').mockReturnValue();
		jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as never);
		jest.spyOn(os, 'homedir').mockReturnValue('~');
	});

	describe('when starting without flag', () => {
		it('should start with default config', async () => {
			await StartCommandExtended.run([], config);
			const [usedGenesisBlock, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedGenesisBlock.header.id).toEqual(devnetGenesisBlock.header.id);
			expect(usedConfig.version).toBe(pJSON.version);
			expect(usedConfig.label).toBe('lisk-core');
		});
	});

	describe('when config already exist in the folder and called with --overwrite-config', () => {
		it('should delete the default config and save the devnet config', async () => {
			await StartCommandExtended.run(['-n', 'default', '--overwrite-config'], config);
			expect(fs.ensureDirSync).toHaveBeenCalledWith('~/.lisk/lisk-core/config');
			expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
		});
	});

	describe('when unknown network is specified', () => {
		it('should throw an error', async () => {
			await expect(StartCommandExtended.run(['-n', 'unknown'], config)).rejects.toThrow(
				'Network unknown is not supported, supported networks: default.',
			);
		});
	});

	describe('when --api-ipc is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--api-ipc'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.rpc.enable).toBe(true);
			expect(usedConfig.rpc.mode).toBe('ipc');
		});
	});

	describe('when --api-ws is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--api-ws'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.rpc.enable).toBe(true);
			expect(usedConfig.rpc.mode).toBe('ws');
		});
	});

	describe('when custom port with --api-ws-port is specified along with --api-ws', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--api-ws', '--api-ws-port', '8888'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.rpc.port).toBe(8888);
		});
	});

	describe('when config is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--config=./config.json'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(fs.readJSON).toHaveBeenCalledWith('./config.json');
			expect(usedConfig.logger.consoleLogLevel).toBe('error');
		});
	});

	describe('when log is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--console-log=trace'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.logger.consoleLogLevel).toBe('trace');
		});

		it('should update the config value from env', async () => {
			process.env.LISK_CONSOLE_LOG_LEVEL = 'error';
			await StartCommandExtended.run([], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.logger.consoleLogLevel).toBe('error');
			process.env.LISK_CONSOLE_LOG_LEVEL = '';
		});
	});

	describe('when file log is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--log=trace'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.logger.fileLogLevel).toBe('trace');
		});

		it('should update the config value for env', async () => {
			process.env.LISK_FILE_LOG_LEVEL = 'trace';
			await StartCommandExtended.run([], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.logger.fileLogLevel).toBe('trace');
			process.env.LISK_FILE_LOG_LEVEL = '';
		});
	});

	describe('when port is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--port=1111'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.network.port).toBe(1111);
		});

		it('should update the config value for env', async () => {
			process.env.LISK_PORT = '1234';
			await StartCommandExtended.run([], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.network.port).toBe(1234);
			process.env.LISK_PORT = '';
		});
	});

	describe('when seed peer is specified', () => {
		it('should update the config value', async () => {
			await StartCommandExtended.run(['--seed-peers=localhost:12234'], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.network.seedPeers).toEqual([{ ip: 'localhost', port: 12234 }]);
		});

		it('should update the config value using env variable', async () => {
			process.env.LISK_SEED_PEERS = 'localhost:12234,74.49.3.35:2238';
			await StartCommandExtended.run([], config);
			const [, usedConfig] = (StartCommandExtended.prototype
				.getApplication as jest.Mock).mock.calls[0];
			expect(usedConfig.network.seedPeers).toEqual([
				{ ip: 'localhost', port: 12234 },
				{ ip: '74.49.3.35', port: 2238 },
			]);
			process.env.LISK_SEED_PEERS = '';
		});
	});
});
