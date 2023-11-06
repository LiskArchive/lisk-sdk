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

import * as apiClient from '@liskhq/lisk-api-client';
import { Command } from '@oclif/core';
import { RegisteredSchema, ModuleMetadataJSON } from 'lisk-framework';
import { PromiseResolvedType } from '../../types';
import { isApplicationRunning } from '../../utils/application';
import { flagsWithParser } from '../../utils/flags';
import { getDefaultPath } from '../../utils/path';

interface BaseIPCClientFlags {
	readonly 'data-path'?: string;
	readonly pretty?: boolean;
}

export abstract class BaseIPCClientCommand extends Command {
	static flags = {
		'data-path': flagsWithParser.dataPath,
		pretty: flagsWithParser.pretty,
	};

	protected baseIPCClientFlags!: BaseIPCClientFlags;
	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;
	protected _schema!: RegisteredSchema;
	protected _metadata!: ModuleMetadataJSON[];
	protected _dataPath!: string;

	async finally(): Promise<void> {
		if (this._client) {
			await this._client.disconnect();
		}
	}

	async init(): Promise<void> {
		const { flags } = await this.parse(this.constructor as typeof BaseIPCClientCommand);
		this.baseIPCClientFlags = flags;
		this._dataPath = this.baseIPCClientFlags['data-path']
			? this.baseIPCClientFlags['data-path']
			: getDefaultPath(this.config.pjson.name);

		if (!isApplicationRunning(this._dataPath)) {
			throw new Error(`Application at data path ${this._dataPath} is not running.`);
		}
		this._client = await apiClient.createIPCClient(this._dataPath);
		this._schema = this._client.schema;
		this._metadata = this._client.metadata;
	}

	printJSON(message?: Record<string, unknown>): void {
		if (this.baseIPCClientFlags.pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}
}
