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

import { codec } from '@liskhq/lisk-codec';
import { encrypt } from '@liskhq/lisk-cryptography';
import { Command, flags as flagParser } from '@oclif/command';
import * as fs from 'fs-extra';
import { flagsWithParser } from '../../../utils/flags';
import { getPasswordFromPrompt } from '../../../utils/reader';

interface KeysWithoutEncryption {
	keys: [
		{
			address: string;
			plain: {
				generatorKey: string;
				generatorPrivateKey: string;
				blsKey: string;
				blsPrivateKey: string;
			};
		},
	];
}

const plainGeneratorKeysSchema = {
	$id: '/commander/plainGeneratorKeys',
	type: 'object',
	properties: {
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		generatorPrivateKey: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		blsPrivateKey: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
	},
};

export class EncryptCommand extends Command {
	static description = 'Encrypt keys from a file and overwrite the file';

	static examples = [
		'keys:encrypt --file-path ./my/path/keys.json',
		'keys:encrypt --file-path ./my/path/keys.json --password mypass',
	];

	static flags = {
		'file-path': flagParser.string({
			char: 'f',
			description: 'Path of the file to encrypt from',
			required: true,
		}),
		password: flagsWithParser.password,
	};

	async run(): Promise<void> {
		const { flags } = this.parse(EncryptCommand);
		const password = flags.password ?? (await getPasswordFromPrompt('password', true));

		const keysWithoutEncryption = (fs.readJSONSync(
			flags['file-path'],
		) as unknown) as KeysWithoutEncryption;

		const keys = [];
		for (const keyWithoutEncryption of keysWithoutEncryption.keys) {
			const plainGeneratorKeyData = {
				generatorKey: Buffer.from(keyWithoutEncryption.plain.generatorKey, 'hex'),
				generatorPrivateKey: Buffer.from(keyWithoutEncryption.plain.generatorPrivateKey, 'hex'),
				blsKey: Buffer.from(keyWithoutEncryption.plain.blsKey, 'hex'),
				blsPrivateKey: Buffer.from(keyWithoutEncryption.plain.blsPrivateKey, 'hex'),
			};
			const encodedGeneratorKeys = codec.encode(plainGeneratorKeysSchema, plainGeneratorKeyData);
			const encryptedMessageObject = await encrypt.encryptMessageWithPassword(
				encodedGeneratorKeys,
				password,
			);

			keys.push({
				...keyWithoutEncryption,
				encrypted: encryptedMessageObject,
			});
		}

		fs.writeJSONSync(flags['file-path'], { keys }, { spaces: ' ' });
	}
}
