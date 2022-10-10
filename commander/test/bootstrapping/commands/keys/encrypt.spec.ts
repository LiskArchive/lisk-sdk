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

import { ed, bls, utils } from '@liskhq/lisk-cryptography';
import * as fs from 'fs-extra';

import * as readerUtils from '../../../../src/utils/reader';
import * as appUtils from '../../../../src/utils/application';
import { EncryptCommand } from '../../../../src/bootstrapping/commands/keys/encrypt';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

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
