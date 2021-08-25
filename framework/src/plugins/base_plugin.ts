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
import { objects } from '@liskhq/lisk-utils';
import { APP_EVENT_READY } from '../constants';
import { ActionsDefinition } from '../controller/action';
import { BaseChannel } from '../controller/channels';
import { EventsDefinition } from '../controller/event';
import { createLogger, Logger } from '../logger';
import { systemDirs } from '../system_dirs';
import {
	ApplicationConfigForPlugin,
	PluginConfig,
	RegisteredSchema,
	SchemaWithDefault,
} from '../types';
import { createPluginCodec, PluginCodec } from './plugin_codec';
import { ImplementationMissingError } from '../errors';

export type InstantiablePlugin<T extends BasePlugin = BasePlugin> = new () => T;

interface PluginInitContext {
	config: PluginConfig;
	channel: BaseChannel;
	appConfig: ApplicationConfigForPlugin;
}

export abstract class BasePlugin<T = Record<string, unknown>> {
	public readonly events: EventsDefinition = [];
	public readonly actions: ActionsDefinition = {};
	public readonly configSchema?: SchemaWithDefault;

	protected schemas!: RegisteredSchema;
	protected codec!: PluginCodec;
	protected logger!: Logger;

	private _config!: T;
	private _appConfig!: ApplicationConfigForPlugin;

	public abstract readonly name: string;

	public get config(): T {
		return this._config;
	}

	public get appConfig(): ApplicationConfigForPlugin {
		return this._appConfig;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		if (this.configSchema) {
			this._config = objects.mergeDeep({}, this.configSchema.default ?? {}, context.config) as T;

			const errors = validator.validate(this.configSchema, (this.config as unknown) as object);

			if (errors.length) {
				throw new LiskValidationError([...errors]);
			}
		} else {
			this._config = {} as T;
		}
		this._appConfig = context.appConfig;

		const dirs = systemDirs(this.appConfig.label, this.appConfig.rootPath);

		this.logger = createLogger({
			consoleLogLevel: this.appConfig.logger.consoleLogLevel,
			fileLogLevel: this.appConfig.logger.fileLogLevel,
			logFilePath: join(dirs.logs, `plugin-${this.name}.log`),
			module: `plugin:${this.name}`,
		});

		context.channel.once(APP_EVENT_READY, async () => {
			this.schemas = await context.channel.invoke('app:getSchema');
			this.codec = createPluginCodec(this.schemas);
		});
	}

	public get dataPath(): string {
		const dirs = systemDirs(this.appConfig.label, this.appConfig.rootPath);

		return join(dirs.plugins, this.name, 'data');
	}

	public abstract get nodeModulePath(): string;
	public abstract load(channel: BaseChannel): Promise<void>;
	public abstract unload(): Promise<void>;
}

// TODO: Once the issue fixed we can use require.resolve to rewrite the logic
//  https://github.com/facebook/jest/issues/9543
export const getPluginExportPath = (PluginKlass: InstantiablePlugin): string | undefined => {
	let plugin: Record<string, unknown> | undefined;
	const pluginInstance = new PluginKlass();

	if (!pluginInstance.nodeModulePath) {
		return;
	}

	try {
		// Check if plugin nodeModulePath is an npm package
		// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
		plugin = require(pluginInstance.nodeModulePath);
	} catch (error) {
		/* Plugin nodeModulePath is not an npm package */
	}

	if (!plugin || !plugin[PluginKlass.name]) {
		return;
	}

	if (plugin[PluginKlass.name] !== PluginKlass) {
		return;
	}

	// eslint-disable-next-line consistent-return
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
