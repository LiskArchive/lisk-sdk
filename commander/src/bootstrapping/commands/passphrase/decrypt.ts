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
import * as cryptography from '@liskhq/lisk-cryptography';
import { Command, Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import { flagsWithParser } from '../../../utils/flags';
import { getPasswordFromPrompt } from '../../../utils/reader';

interface EncryptedMessageObject {
	readonly version: string;
	readonly ciphertext: string;
	readonly mac: string;
	readonly kdf: cryptography.encrypt.KDF;
	readonly kdfparams: {
		parallelism: number;
		iterations: number;
		memorySize: number;
		salt: string;
	};
	readonly cipher: cryptography.encrypt.Cipher;
	readonly cipherparams: {
		iv: string;
		tag: string;
	};
}

interface inputFileData {
	encryptedPassphrase: EncryptedMessageObject;
	publicKey?: string;
}

export class DecryptCommand extends Command {
	static description =
		'Decrypt secret passphrase using the password provided at the time of encryption.';

	static examples = [
		'passphrase:decrypt --file-path ./my/path/output.json',
		'passphrase:decrypt --file-path ./my/path/output.json --password your-password',
	];

	static flags = {
		password: flagsWithParser.password,
		'file-path': flagParser.string({
			char: 'f',
			description: 'Path of the file to import from',
			required: true,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(DecryptCommand);
		const { encryptedPassphrase } = fs.readJSONSync(flags['file-path']) as unknown as inputFileData;
		const password = flags.password ?? (await getPasswordFromPrompt('password'));
		const passphrase = await cryptography.encrypt.decryptMessageWithPassword(
			encryptedPassphrase,
			password,
			'utf-8',
		);

		this.log(JSON.stringify(passphrase, undefined, '  '));
	}
}
