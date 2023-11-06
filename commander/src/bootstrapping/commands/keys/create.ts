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
import { bls, address as addressUtil, ed, encrypt, legacy } from '@liskhq/lisk-cryptography';
import { Command, Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt, getPasswordFromPrompt } from '../../../utils/reader';
import { OWNER_READ_WRITE, plainGeneratorKeysSchema } from '../../../constants';

export class CreateCommand extends Command {
	static description = 'Return keys corresponding to the given passphrase.';

	static examples = [
		'keys:create',
		'keys:create --passphrase your-passphrase',
		'keys:create --passphrase your-passphrase --no-encrypt',
		'keys:create --passphrase your-passphrase --password your-password',
		'keys:create --passphrase your-passphrase --password your-password --count 2',
		'keys:create --passphrase your-passphrase --no-encrypt --count 2 --offset 1',
		'keys:create --passphrase your-passphrase --no-encrypt --count 2 --offset 1 --chainid 1',
		'keys:create --passphrase your-passphrase --password your-password --count 2 --offset 1 --chainid 1 --output /mypath/keys.json',
	];

	static flags = {
		output: flagsWithParser.output,
		passphrase: flagsWithParser.passphrase,
		'no-encrypt': flagParser.boolean({
			char: 'n',
			description: 'No encrypted message object to be created',
			default: false,
		}),
		password: flagsWithParser.password,
		count: flagParser.integer({
			char: 'c',
			description: 'Number of keys to create',
			default: 1,
		}),
		offset: flagParser.integer({
			char: 'f',
			description: 'Offset for the key derivation path',
			default: 0,
		}),
		chainid: flagParser.integer({
			char: 'i',
			description: 'Chain id',
			default: 0,
		}),
		'add-legacy': flagParser.boolean({
			description: 'Add legacy key derivation path to the result',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: {
				output,
				passphrase: passphraseSource,
				'no-encrypt': noEncrypt,
				password: passwordSource,
				count,
				offset,
				chainid,
				'add-legacy': addLegacy,
			},
		} = await this.parse(CreateCommand);

		if (output) {
			const { dir } = path.parse(output);
			fs.ensureDirSync(dir);
		}
		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
		let password = '';
		if (!noEncrypt) {
			password = passwordSource ?? (await getPasswordFromPrompt('password', true));
		}

		const keys = [];
		let i = 0;
		if (addLegacy) {
			const legacyKeyPath = 'legacy';
			const { privateKey: accountPrivateKey, publicKey: accountPublicKey } =
				legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
			const address = addressUtil.getAddressFromPublicKey(accountPublicKey);
			const generatorPrivateKey = accountPrivateKey;
			const generatorPublicKey = ed.getPublicKeyFromPrivateKey(generatorPrivateKey);
			const blsKeyPath = `m/12381/134/${chainid}/99999`;
			const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath(passphrase, blsKeyPath);
			const blsPublicKey = bls.getPublicKeyFromPrivateKey(blsPrivateKey);
			const result = await this._createEncryptedObject(
				{
					address,
					keyPath: legacyKeyPath,
					accountPrivateKey,
					accountPublicKey,
					generatorKeyPath: legacyKeyPath,
					generatorPrivateKey,
					generatorPublicKey,
					blsKeyPath,
					blsPrivateKey,
					blsPublicKey,
					password,
				},
				noEncrypt,
			);
			keys.push(result);
			i += 1;
		}
		for (; i < count; i += 1) {
			const accountKeyPath = `m/44'/134'/${offset + i}'`;
			const generatorKeyPath = `m/25519'/134'/${chainid}'/${offset + i}'`;
			const blsKeyPath = `m/12381/134/${chainid}/${offset + i}`;

			const accountPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(passphrase, accountKeyPath);
			const accountPublicKey = ed.getPublicKeyFromPrivateKey(accountPrivateKey);
			const address = addressUtil.getAddressFromPublicKey(accountPublicKey);
			const generatorPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(
				passphrase,
				generatorKeyPath,
			);
			const generatorPublicKey = ed.getPublicKeyFromPrivateKey(generatorPrivateKey);
			const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath(passphrase, blsKeyPath);
			const blsPublicKey = bls.getPublicKeyFromPrivateKey(blsPrivateKey);

			const result = await this._createEncryptedObject(
				{
					address,
					keyPath: accountKeyPath,
					accountPrivateKey,
					accountPublicKey,
					generatorKeyPath,
					generatorPrivateKey,
					generatorPublicKey,
					blsKeyPath,
					blsPrivateKey,
					blsPublicKey,
					password,
				},
				noEncrypt,
			);
			keys.push(result);
		}

		if (output) {
			fs.writeJSONSync(output, { keys }, { spaces: ' ', mode: OWNER_READ_WRITE });
		} else {
			this.log(JSON.stringify({ keys }, undefined, '  '));
		}
	}
	private async _createEncryptedObject(
		input: {
			address: Buffer;
			keyPath: string;
			accountPublicKey: Buffer;
			accountPrivateKey: Buffer;
			generatorKeyPath: string;
			generatorPublicKey: Buffer;
			generatorPrivateKey: Buffer;
			blsKeyPath: string;
			blsPublicKey: Buffer;
			blsPrivateKey: Buffer;
			password: string;
		},
		noEncrypt: boolean,
	) {
		let encryptedMessageObject = {};
		if (!noEncrypt) {
			const plainGeneratorKeyData = {
				generatorKey: input.generatorPublicKey,
				generatorPrivateKey: input.generatorPrivateKey,
				blsKey: input.blsPublicKey,
				blsPrivateKey: input.blsPrivateKey,
			};
			const encodedGeneratorKeys = codec.encode(plainGeneratorKeysSchema, plainGeneratorKeyData);
			encryptedMessageObject = await encrypt.encryptMessageWithPassword(
				encodedGeneratorKeys,
				input.password,
			);
		}

		return {
			address: addressUtil.getLisk32AddressFromAddress(input.address),
			keyPath: input.keyPath,
			publicKey: input.accountPublicKey.toString('hex'),
			privateKey: input.accountPrivateKey.toString('hex'),
			plain: {
				generatorKeyPath: input.generatorKeyPath,
				generatorKey: input.generatorPublicKey.toString('hex'),
				generatorPrivateKey: input.generatorPrivateKey.toString('hex'),
				blsKeyPath: input.blsKeyPath,
				blsKey: input.blsPublicKey.toString('hex'),
				blsProofOfPossession: bls.popProve(input.blsPrivateKey).toString('hex'),
				blsPrivateKey: input.blsPrivateKey.toString('hex'),
			},
			encrypted: encryptedMessageObject,
		};
	}
}
