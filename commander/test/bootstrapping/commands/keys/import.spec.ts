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

import { ed, bls, encrypt, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import * as apiClient from '@liskhq/lisk-api-client';
import * as fs from 'fs-extra';

import * as appUtils from '../../../../src/utils/application';
import { ImportCommand } from '../../../../src/bootstrapping/commands/keys/import';
import { getConfig } from '../../../helpers/config';
import { plainGeneratorKeysSchema } from '../../../../src/bootstrapping/commands/keys/create';
import { Awaited } from '../../../types';

describe('keys:import', () => {
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
	let defaultEncryptedKeys: {
		address: Buffer;
		type: 'encrypted';
		data: encrypt.EncryptedMessageObject;
	};
	let fileData: any;
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let invokeMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'readJSONSync');
		invokeMock = jest.fn();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
	});

	describe('when importing without a file path flag', () => {
		it('should throw an error', async () => {
			await expect(ImportCommand.run([], config)).rejects.toThrow(
				'Missing required flag file-path',
			);
		});
	});

	describe('when importing without an existing file', () => {
		it('should throw an error', async () => {
			await expect(ImportCommand.run(['--file-path=/my/path/keys.json'], config)).rejects.toThrow(
				`ENOENT: no such file or directory, open '/my/path/keys.json'`,
			);
		});
	});

	describe('when importing with existing file', () => {
		beforeEach(async () => {
			const generatorPrivateKey = await ed.getKeyPairFromPhraseAndPath(
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
			defaultEncryptedKeys = {
				address: Buffer.from('9cabee3d27426676b852ce6b804cb2fdff7cd0b5', 'hex'),
				type: 'encrypted',
				data: await encrypt.encryptAES256GCMWithPassword(
					codec.encode(plainGeneratorKeysSchema, defaultKeys),
					defaultPassword,
				),
			};
		});

		describe('when input file has only plain data', () => {
			it('should import plain data', async () => {
				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
						},
					],
				};
				(fs.readJSONSync as jest.Mock).mockReturnValue(fileData);
				await ImportCommand.run(['--file-path=/my/path/keys.json'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setKeys', {
					address,
					type: 'plain',
					data: defaultKeysJSON,
				});
			});
		});

		describe('when input file has plain data and empty encrypted object', () => {
			it('should import plain data', async () => {
				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
							encrypted: {},
						},
					],
				};
				(fs.readJSONSync as jest.Mock).mockReturnValue(fileData);
				await ImportCommand.run(['--file-path=/my/path/keys.json'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setKeys', {
					address,
					type: 'plain',
					data: defaultKeysJSON,
				});
			});
		});

		describe('when input file has both plain & encrypted data', () => {
			it('should import encrypted data', async () => {
				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
							encrypted: defaultEncryptedKeys.data,
						},
					],
				};
				(fs.readJSONSync as jest.Mock).mockReturnValue(fileData);
				await ImportCommand.run(['--file-path=/my/path/keys.json', '--data-path=/my/app/'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setKeys', {
					address,
					type: 'encrypted',
					data: defaultEncryptedKeys.data,
				});
			});
		});

		describe('when input file has only encrypted data', () => {
			it('should import encrypted data', async () => {
				fileData = {
					keys: [
						{
							address,
							encrypted: defaultEncryptedKeys.data,
						},
					],
				};
				(fs.readJSONSync as jest.Mock).mockReturnValue(fileData);
				await ImportCommand.run(['--file-path=/my/path/keys.json', '--data-path=/my/app/'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setKeys', {
					address,
					type: 'encrypted',
					data: defaultEncryptedKeys.data,
				});
			});
		});
	});
});
