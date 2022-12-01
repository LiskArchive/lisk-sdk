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

interface KeysWithInfo {
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
	generatorInfo: [
		{
			address: string;
			height: number;
			maxHeightGenerated: number;
			maxHeightPrevoted: number;
		},
	];
}

export abstract class ImportCommand extends BaseIPCClientCommand {
	static description = 'Import from <FILE>.';

	static examples = [
		'generator:import --file-path ./my/path/genInfo.json',
		'generator:import --file-path ./my/path/genInfo.json --data-path ./data ',
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

		const fileData = fs.readJSONSync(flags['file-path']) as unknown as KeysWithInfo;

		for (const info of fileData.generatorInfo) {
			await this._client.invoke('generator_setStatus', info);
		}
	}
}
