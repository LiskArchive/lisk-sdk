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

import { encrypt } from '@liskhq/lisk-cryptography';
import * as apiClient from '@liskhq/lisk-api-client';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getDefaultPath } from '../../../utils/path';
import { flagsWithParser } from '../../../utils/flags';
import { PromiseResolvedType } from '../../../types';
import { getApiClient } from '../../../utils/transaction';
import { BaseIPCClientCommand } from '../base_ipc_client';

interface EncryptedMessageObject {
	readonly version: string;
	readonly ciphertext: string;
	readonly mac: string;
	readonly kdf: encrypt.KDF;
	readonly kdfparams: {
		parallelism: number;
		iterations: number;
		memorySize: number;
		salt: string;
	};
	readonly cipher: encrypt.Cipher;
	readonly cipherparams: {
		iv: string;
		tag: string;
	};
}

interface GetKeysResponse {
	keys: [
		{
			address: string;
			type: 'encrypted' | 'plain';
			data:
				| EncryptedMessageObject
				| {
						generatorKey: string;
						generatorPrivateKey: string;
						blsKey: string;
						blsPrivateKey: string;
				  };
		},
	];
}

export abstract class ExportCommand extends BaseIPCClientCommand {
	static description = 'Export to <FILE>.';

	static examples = [
		'keys:export --output /mypath/keys.json',
		'keys:export --output /mypath/keys.json --data-path ./data ',
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		output: {
			...flagsWithParser.output,
			// ...flagParser.string({
			// 	required: true,
			// }),
		},
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;

	async run(): Promise<void> {
		const { flags } = await this.parse(ExportCommand);
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		// const { dir } = path.parse(flags.output);
		// fs.ensureDirSync(dir);
		if (flags.output) {
			const { dir } = path.parse(flags.output);
			fs.ensureDirSync(dir);
		}

		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		this._client = await getApiClient(dataPath, this.config.pjson.name);
		const response = await this._client.invoke<GetKeysResponse>('generator_getAllKeys');

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

		// fs.writeJSONSync(flags.output, { keys }, { spaces: ' ' });
		if (flags.output) {
			fs.writeJSONSync(flags.output, { keys }, { spaces: ' ' });
		}
	}
}
