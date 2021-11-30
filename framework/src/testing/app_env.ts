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

import { APIClient, createIPCClient } from '@liskhq/lisk-api-client';
import { codec } from '@liskhq/lisk-codec';
import { join } from 'path';
import { Block } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { homedir } from 'os';
import { existsSync, rmdirSync } from 'fs-extra';
import { defaultConfig } from './fixtures';
import { PartialApplicationConfig } from '../types';
import { Application } from '../application';
import { BaseModule } from '../modules';
import { RPC_MODES } from '../constants';
import { BasePlugin } from '../plugins/base_plugin';

interface ApplicationEnvConfig {
	modules: BaseModule[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	plugins?: BasePlugin<any>[];
	config?: PartialApplicationConfig;
	genesisBlockJSON?: Record<string, unknown>;
}

export class ApplicationEnv {
	private _application!: Application;
	private _dataPath!: string;
	private _ipcClient!: APIClient;
	private _genesisBlock!: Block;

	public constructor(appConfig: ApplicationEnvConfig) {
		this._initApplication(appConfig);
	}

	public get application(): Application {
		return this._application;
	}

	public get ipcClient(): APIClient {
		return this._ipcClient;
	}

	public get dataPath(): string {
		return this._dataPath;
	}

	public get networkIdentifier(): Buffer {
		return this._application.networkIdentifier;
	}

	public get lastBlock(): Block {
		// eslint-disable-next-line dot-notation
		return this._application['_node']['_chain'].lastBlock;
	}

	public async startApplication(): Promise<void> {
		this._genesisBlock = await this._application.generateGenesisBlock({
			assets: [],
		});
		await Promise.race([
			this._application.run(this._genesisBlock),
			new Promise(resolve => setTimeout(resolve, 3000)),
		]);
		// Only start client when ipc is enabled
		if (this._application.config.rpc.modes.includes(RPC_MODES.IPC)) {
			this._ipcClient = await createIPCClient(this._dataPath);
		}
	}

	public async stopApplication(options: { clearDB: boolean } = { clearDB: true }): Promise<void> {
		if (options.clearDB) {
			// eslint-disable-next-line dot-notation
			await this._application['_forgerDB'].clear();
			// eslint-disable-next-line dot-notation
			await this._application['_blockchainDB'].clear();
			// eslint-disable-next-line dot-notation
			await this._application['_nodeDB'].clear();
		}
		if (this._application.config.rpc.modes.includes(RPC_MODES.IPC)) {
			await this._ipcClient.disconnect();
		}
		await this._application.shutdown();
	}

	public async waitNBlocks(n = 1): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
		const height = this.lastBlock.header.height + n;
		return new Promise(resolve => {
			this._application.channel.subscribe('app_block:new', () => {
				if (this.lastBlock.header.height >= height) {
					resolve();
				}
			});
		});
	}

	private _initApplication(appConfig: ApplicationEnvConfig): Application {
		// As we can call this function with different configuration
		// so we need to make sure existing schemas are already clear
		codec.clearCache();
		// In order for application to start forging, update force to true
		const config = objects.mergeDeep({}, defaultConfig, appConfig.config ?? {});
		const { label } = config;

		const application = new Application(config as PartialApplicationConfig);
		appConfig.modules.map(module => application.registerModule(module));
		appConfig.plugins?.map(plugin => application.registerPlugin(plugin));
		this._dataPath = join(application.config.rootPath, label);
		this._application = application;
		return application;
	}
}

export const createDefaultApplicationEnv = (
	appEnvConfig: Partial<ApplicationEnvConfig>,
): ApplicationEnv => {
	const rootPath = appEnvConfig.config?.rootPath ?? defaultConfig.rootPath;
	const label = appEnvConfig.config?.label ?? defaultConfig.label;

	// Ensure directory is cleaned for each application env
	const dataPath = join(rootPath.replace('~', homedir()), label);
	if (existsSync(dataPath)) {
		rmdirSync(dataPath, { recursive: true });
	}

	const modules: BaseModule[] = [];

	for (const mod of appEnvConfig.modules ?? []) {
		modules.push(mod);
	}

	const appEnv = new ApplicationEnv({
		...appEnvConfig,
		modules,
		genesisBlockJSON: {},
	});

	return appEnv;
};
