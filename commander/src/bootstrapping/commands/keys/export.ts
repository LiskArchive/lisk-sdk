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
import { resolve } from 'path';
import * as inquirer from 'inquirer';
import { getDefaultPath } from '../../../utils/path';
import { flagsWithParser } from '../../../utils/flags';
import { PromiseResolvedType } from '../../../types';
import { getApiClient } from '../../../utils/transaction';

interface GetKeysResponse {
	keys: [
		{
			address: string;
			type: 'encrypted' | 'plain';
			data:
				| {
						kdf: string;
						cipherText: string;
						iterations: number;
				  }
				| {
						generatorKey: string;
						generatorPrivateKey: string;
						blsKey: string;
						blsPrivateKey: string;
				  };
		},
	];
}

export abstract class ExportCommand extends Command {
	static description = 'Export to <FILE>.';

	static examples = [
		'keys:export --output ./my/path/',
		'keys:export --output ./my/path/ --data-path ./data ',
	];

	static flags = {
		'data-path': flagsWithParser.dataPath,
		output: {
			...flagsWithParser.output,
			...flagParser.string({
				required: true,
			}),
		},
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;

	async run(): Promise<void> {
		const { flags } = this.parse(ExportCommand);

		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		this._client = await getApiClient(dataPath, this.config.pjson.name);
		const response = await this._client.invoke<GetKeysResponse>('generator_getKey');

		const keys = response.keys.map(k => {
			if (k.type === 'encrypted') {
				return {
					address: k.address,
					encrypted: k.data,
				};
			}
			return {
				address: k.address,
				plain: k.data,
			};
		});

		const filePath = resolve(flags.output);

		if (fs.existsSync(filePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message: 'A keys file already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				this.error('Operation cancelled, keys file already present at the desired location');
			} else {
				fs.writeJSONSync(resolve(filePath, 'keys.json'), keys, { spaces: '\t' });
			}
		} else {
			fs.mkdirSync(filePath, { recursive: true });
			fs.writeJSONSync(resolve(filePath, 'keys.json'), keys, { spaces: '\t' });
		}
	}
}
