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

	public async startApplication(): Promise<void> {
		const genesisBlock = await this._application.generateGenesisBlock({
			assets: [],
			chainID: Buffer.from(this._application.config.genesis.chainID, 'hex'),
		});
		this._application.config.genesis.block.blob = genesisBlock.getBytes().toString('hex');

		await Promise.race([
			this._application.run(),
			new Promise(resolve => setTimeout(resolve, 3000)),
		]);
		// Only start client when ipc is enabled
		if (this._application.config.rpc.modes.includes(RPC_MODES.IPC)) {
			this._ipcClient = await createIPCClient(this._dataPath);
		}
	}

	public async stopApplication(options: { clearDB: boolean } = { clearDB: true }): Promise<void> {
		if (options.clearDB) {
			rmdirSync(this._dataPath);
		}
		if (this._application.config.rpc.modes.includes(RPC_MODES.IPC)) {
			await this._ipcClient.disconnect();
		}
		await this._application.shutdown();
	}

	private _initApplication(appConfig: ApplicationEnvConfig): Application {
		// As we can call this function with different configuration
		// so we need to make sure existing schemas are already clear
		codec.clearCache();
		// In order for application to start forging, update force to true
		const config = objects.mergeDeep({}, defaultConfig, appConfig.config ?? {});

		const application = new Application(config as PartialApplicationConfig);
		appConfig.modules.map(module => application.registerModule(module));
		appConfig.plugins?.map(plugin => application.registerPlugin(plugin));
		this._dataPath = application.config.system.dataPath;
		this._application = application;
		return application;
	}
}

export const createDefaultApplicationEnv = (
	appEnvConfig: Partial<ApplicationEnvConfig>,
): ApplicationEnv => {
	const dataPath = (appEnvConfig.config?.system?.dataPath ?? defaultConfig.system.dataPath).replace(
		'~',
		homedir(),
	);

	// Ensure directory is cleaned for each application env
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
