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

import { ed, bls, utils, encrypt } from '@liskhq/lisk-cryptography';
import * as fs from 'fs-extra';

import * as readerUtils from '../../../../src/utils/reader';
import * as appUtils from '../../../../src/utils/application';
import { EncryptCommand } from '../../../../src/bootstrapping/commands/keys/encrypt';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';
import { OWNER_READ_WRITE } from '../../../../src/constants';

describe('keys:encrypt', () => {
	const defaultPassword = 'elephant tree paris dragon chair galaxy';
	const address = utils.getRandomBytes(20).toString('hex');

	let defaultKeys: {
		generatorKey: Buffer;
		generatorPrivateKey: Buffer;
		blsKey: Buffer;
		blsPrivateKey: Buffer;
	};
	let defaultKeysJSON: {
		generatorKey: string;
		generatorPrivateKey: string;
		blsKey: string;
		blsPrivateKey: string;
	};
	let fileData: any;
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		jest.spyOn(fs, 'readJSONSync');
		jest.spyOn(readerUtils, 'getPasswordFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'password') {
				return defaultPassword;
			}
			return '';
		});
		jest.spyOn(encrypt, 'encryptMessageWithPassword').mockResolvedValue({
			ciphertext:
				'3735d984bd46e476019696afd973f6eaeb591e974f99d143d9292a01a4e65dabccb7fac3091e8c3340eeb16c83d5ecc9cac627d2154efc358d4d3318358eddbca9411e20bf77113252407fc94f4fbf0330a7102a7cd990e4952d9efdf20998f72b6a51f0c17a19ffa72118ebf1114b73ee7c2227ec4d1253ecd0df33cfaa72ee68ee0ddeff72db43a98646e1e55551c261dcf263f5bec55bb84672b5b7c234ffdf9551eeb9d80cb72480adef673d1b37ba12fca26638bd5e',
			mac: '6f00f5a62b8c7e640f85e6c02c64479b5c9137fdd5e9fa38c2edcd11483ce743',
			kdf: encrypt.KDF.ARGON2,
			kdfparams: {
				parallelism: 4,
				iterations: 1,
				memorySize: 2097023,
				salt: 'bd25ddc98eba7d8bf60a6738fca3ac23',
			},
			cipher: encrypt.Cipher.AES256GCM,
			cipherparams: {
				iv: '1933be196b54d01fd0979294',
				tag: '11398f4dcfd776d783a35721c326f007',
			},
			version: '1',
		});
	});

	describe('when encrypting without a file path flag', () => {
		it('should throw an error', async () => {
			await expect(EncryptCommand.run([], config)).rejects.toThrow(
				'Missing required flag file-path',
			);
		});
	});

	describe('when encrypting with a file path flag', () => {
		beforeEach(async () => {
			const generatorPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(
				'passphrase',
				"m/25519'/134'/0'/0'",
			);
			const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath(
				'passphrase',
				'm/12381/134/0/0',
			);
			defaultKeys = {
				generatorKey: ed.getPublicKeyFromPrivateKey(generatorPrivateKey),
				generatorPrivateKey,
				blsPrivateKey,
				blsKey: bls.getPublicKeyFromPrivateKey(blsPrivateKey),
			};
			defaultKeysJSON = {
				generatorKey: defaultKeys.generatorKey.toString('hex'),
				generatorPrivateKey: defaultKeys.generatorPrivateKey.toString('hex'),
				blsPrivateKey: defaultKeys.blsPrivateKey.toString('hex'),
				blsKey: defaultKeys.blsKey.toString('hex'),
			};
		});

		describe('when input file exists', () => {
			it('should encrypt the data and overwrite the file', async () => {
				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
						},
					],
				};
				(fs.readJSONSync as jest.Mock).mockReturnValue(fileData);
				await EncryptCommand.run(['--file-path=/my/path/keys.json'], config);
				expect(fs.writeJSONSync).toHaveBeenCalledTimes(1);
				expect(fs.writeJSONSync).toHaveBeenCalledWith('/my/path/keys.json', expect.anything(), {
					spaces: ' ',
					mode: OWNER_READ_WRITE,
				});
			});
		});

		describe('when input file does not exist', () => {
			it('should encrypt the data and overwrite the file', async () => {
				await expect(
					EncryptCommand.run(['--file-path=/my/path/keys.json'], config),
				).rejects.toThrow(`ENOENT: no such file or directory, open '/my/path/keys.json'`);
			});
		});
	});
});
