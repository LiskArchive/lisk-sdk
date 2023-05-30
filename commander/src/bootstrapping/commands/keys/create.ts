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
import { bls, address as addressUtil, ed, encrypt } from '@liskhq/lisk-cryptography';
import { Command, Flags as flagParser } from '@oclif/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt, getPasswordFromPrompt } from '../../../utils/reader';
import { OWNER_READ_WRITE } from '../../../constants';

export const plainGeneratorKeysSchema = {
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
		for (let i = 0; i < count; i += 1) {
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

			let encryptedMessageObject = {};
			if (!noEncrypt) {
				const plainGeneratorKeyData = {
					generatorKey: generatorPublicKey,
					generatorPrivateKey,
					blsKey: blsPublicKey,
					blsPrivateKey,
				};
				const encodedGeneratorKeys = codec.encode(plainGeneratorKeysSchema, plainGeneratorKeyData);
				encryptedMessageObject = await encrypt.encryptMessageWithPassword(
					encodedGeneratorKeys,
					password,
				);
			}

			keys.push({
				address: addressUtil.getLisk32AddressFromAddress(address),
				keyPath: accountKeyPath,
				publicKey: accountPublicKey.toString('hex'),
				privateKey: accountPrivateKey.toString('hex'),
				plain: {
					generatorKeyPath,
					generatorKey: generatorPublicKey.toString('hex'),
					generatorPrivateKey: generatorPrivateKey.toString('hex'),
					blsKeyPath,
					blsKey: blsPublicKey.toString('hex'),
					blsProofOfPossession: bls.popProve(blsPrivateKey).toString('hex'),
					blsPrivateKey: blsPrivateKey.toString('hex'),
				},
				encrypted: encryptedMessageObject,
			});
		}

		if (output) {
			fs.writeJSONSync(output, { keys }, { spaces: ' ', mode: OWNER_READ_WRITE });
		} else {
			this.log(JSON.stringify({ keys }, undefined, '  '));
		}
	}
}
