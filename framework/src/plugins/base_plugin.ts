/*
 * Copyright © 2019 Lisk Foundation
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
import { join } from 'path';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { APIClient, createIPCClient } from '@liskhq/lisk-api-client';
import { objects } from '@liskhq/lisk-utils';
import { BaseChannel } from '../controller/channels';
import { Logger } from '../logger';
import { systemDirs } from '../system_dirs';
import { ApplicationConfigForPlugin, PluginConfig, SchemaWithDefault } from '../types';
import { ImplementationMissingError } from '../errors';
import { BasePluginEndpoint } from './base_plugin_endpoint';

export interface PluginInitContext<T = Record<string, unknown>> {
	logger: Logger;
	config: PluginConfig & T;
	channel: BaseChannel;
	appConfig: ApplicationConfigForPlugin;
}

export const getPluginExportPath = (pluginInstance: BasePlugin): string | undefined => {
	let plugin: Record<string, unknown> | undefined;
	if (!pluginInstance.nodeModulePath) {
		return undefined;
	}

	try {
		// Check if plugin nodeModulePath is an npm package
		// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
		plugin = require(pluginInstance.nodeModulePath);
	} catch (error) {
		/* Plugin nodeModulePath is not an npm package */
	}

	if (!plugin || !plugin[pluginInstance.constructor.name]) {
		return undefined;
	}

	const Klass = plugin[pluginInstance.constructor.name];
	if (typeof Klass !== 'function' || Klass.name !== pluginInstance.constructor.name) {
		return undefined;
	}

	if (!(pluginInstance instanceof Klass)) {
		return undefined;
	}

	return pluginInstance.nodeModulePath;
};

export const validatePluginSpec = (pluginInstance: BasePlugin): void => {
	if (!pluginInstance.name) {
		throw new ImplementationMissingError('Plugin "name" is required.');
	}

	if (!pluginInstance.load) {
		throw new ImplementationMissingError('Plugin "load" interface is required.');
	}

	if (!pluginInstance.unload) {
		throw new ImplementationMissingError('Plugin "unload" interface is required.');
	}

	if (pluginInstance.configSchema) {
		const errors = validator.validateSchema(pluginInstance.configSchema);
		if (errors.length) {
			throw new LiskValidationError([...errors]);
		}
	}
};

export abstract class BasePlugin<T = Record<string, unknown>> {
	public readonly configSchema?: SchemaWithDefault;
	public endpoint?: BasePluginEndpoint;

	protected logger!: Logger;
	protected channel!: BaseChannel;

	private _apiClient!: APIClient;
	private _config!: T;
	private _appConfig!: ApplicationConfigForPlugin;

	public abstract readonly name: string;

	public get config(): T {
		return this._config;
	}

	public get appConfig(): ApplicationConfigForPlugin {
		return this._appConfig;
	}

	public get dataPath(): string {
		const dirs = systemDirs(this.appConfig.label, this.appConfig.rootPath);

		return join(dirs.plugins, this.name, 'data');
	}

	public get events(): string[] {
		return [];
	}

	public get apiClient(): APIClient {
		if (!this._apiClient) {
			throw new Error('RPC with IPC protocol must be enabled to use APIClient.');
		}
		return this._apiClient;
	}

	public async init(context: PluginInitContext): Promise<void> {
		this.logger = context.logger;
		this.channel = context.channel;
		if (this.configSchema) {
			this._config = objects.mergeDeep({}, this.configSchema.default ?? {}, context.config) as T;

			const errors = validator.validate(this.configSchema, this.config as Record<string, unknown>);

			if (errors.length) {
				throw new LiskValidationError([...errors]);
			}
		} else {
			this._config = {} as T;
		}
		this._appConfig = context.appConfig;

		if (this._appConfig.rpc.modes.includes('ipc') && this._appConfig.rpc.ipc?.path !== undefined) {
			this._apiClient = await createIPCClient(this._appConfig.rpc.ipc?.path);
		}
	}

	public abstract get nodeModulePath(): string;
	public abstract load(): Promise<void>;
	public abstract unload(): Promise<void>;
}
