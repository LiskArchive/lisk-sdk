/* eslint-disable no-console */
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
import { flagsWithParser } from '../../../utils/flags';
import { BaseIPCClientCommand } from '../base_ipc_client';
import { handleOutputFlag } from '../../../utils/output';

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
		},
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ExportCommand);

		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		const response = await this._client.invoke<GetKeysResponse>('generator_getAllKeys');

		const keys = response?.keys.map(k => {
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

		if (flags.output) {
			const res = await handleOutputFlag(flags.output, { keys }, 'keys');
			this.log(res);
		}
	}
}
