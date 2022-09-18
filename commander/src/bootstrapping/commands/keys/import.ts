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
import { Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import { PromiseResolvedType } from '../../../types';
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
			encrypted?: EncryptedMessageObject;
		},
	];
}

export abstract class ImportCommand extends BaseIPCClientCommand {
	static description = 'Import from <FILE>.';

	static examples = [
		'keys:import --file-path ./my/path/keys.json',
		'keys:import --file-path ./my/path/keys.json --data-path ./data ',
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		'file-path': flagParser.string({
			char: 'f',
			description: 'Path of the file to import from',
			required: true,
		}),
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;

	async run(): Promise<void> {
		const { flags } = await this.parse(ImportCommand);
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}

		const fileData = (fs.readJSONSync(flags['file-path']) as unknown) as Keys;
		const keys = fileData.keys.map(k => {
			let type: 'encrypted' | 'plain';
			let returnData;
			if (k.encrypted && Object.keys(k.encrypted).length !== 0) {
				type = 'encrypted';
				returnData = k.encrypted;
			} else {
				type = 'plain';
				returnData = k.plain;
			}
			return {
				address: k.address,
				type,
				data: returnData,
			};
		});

		for (const key of keys) {
			await this._client.invoke('generator_setKeys', key);
		}
	}
}
