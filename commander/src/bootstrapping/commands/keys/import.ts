/*
 * Copyright © 2022 Lisk Foundation
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
import { Command, flags as flagParser } from '@oclif/command';
import * as fs from 'fs-extra';
import { getDefaultPath } from '../../../utils/path';
import { flagsWithParser } from '../../../utils/flags';
import { PromiseResolvedType } from '../../../types';
import { getApiClient } from '../../../utils/transaction';

interface Keys {
	keys: [
		{
			address: string;
			plain?: {
				generatorKey: string;
				generatorPrivateKey: string;
				blsKey: string;
				blsPrivateKey: string;
			};
			encrypted?: Record<string, unknown>;
		},
	];
}

export abstract class ImportCommand extends Command {
	static description = 'Import from <FILE>.';

	static examples = [
		'keys:import --file-path ./my/path/keys.json',
		'keys:import --file-path ./my/path/keys.json --data-path ./data ',
	];

	static flags = {
		'file-path': flagParser.string({
			char: 'f',
			description: 'Path of the file to import from',
			required: true,
		}),
		'data-path': flagsWithParser.dataPath,
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;

	async run(): Promise<void> {
		const { flags } = this.parse(ImportCommand);
		const keys = JSON.parse(fs.readFileSync(flags['file-path'], 'utf8')) as Keys;
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		this._client = await getApiClient(dataPath, this.config.pjson.name);
		await this._client.invoke('generator_setKey', { keys });
	}
}
