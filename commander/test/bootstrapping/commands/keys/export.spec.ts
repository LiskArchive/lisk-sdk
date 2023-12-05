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
import { when } from 'jest-when';
import * as fs from 'fs-extra';

import * as appUtils from '../../../../src/utils/application';
import { ExportCommand } from '../../../../src/bootstrapping/commands/keys/export';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';
import { OWNER_READ_WRITE, plainGeneratorKeysSchema } from '../../../../src/constants';
import * as outputUtils from '../../../../src/utils/output';

describe('keys:export', () => {
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
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		invokeMock = jest.fn();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
	});

	describe('run', () => {
		describe('when calling the handleOutputFlag', () => {
			it('should call handleOutputFlag with the correct params', async () => {
				when(invokeMock)
					.calledWith('generator_getAllKeys')
					.mockResolvedValue({
						keys: [
							{
								address,
								type: 'plain',
								data: defaultKeysJSON,
							},
						],
					});

				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
						},
					],
				};

				jest
					.spyOn(outputUtils, 'handleOutputFlag')
					.mockImplementation(async () =>
						Promise.resolve('Successfully written data to /my/path/keys.json'),
					);

				await ExportCommand.run(['--output=/my/path/keys.json'], config);

				expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
					'/my/path/keys.json',
					fileData,
					'keys',
				);
			});

			it('should throw an error when handleOutputFlag errs', async () => {
				when(invokeMock)
					.calledWith('generator_getAllKeys')
					.mockResolvedValue({
						keys: [
							{
								address,
								type: 'plain',
								data: defaultKeysJSON,
							},
						],
					});

				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
						},
					],
				};

				jest
					.spyOn(outputUtils, 'handleOutputFlag')
					.mockImplementation(async () =>
						Promise.reject(
							new Error('Error writing data to /my/path/keys.json: Error: write error'),
						),
					);

				await expect(ExportCommand.run(['--output=/my/path/keys.json'], config)).rejects.toThrow(
					'Error writing data to /my/path/keys.json: Error: write error',
				);
			});
		});
	});

	describe('when exporting with a file path flag', () => {
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

			defaultEncryptedKeys = {
				address: Buffer.from('9cabee3d27426676b852ce6b804cb2fdff7cd0b5', 'hex'),
				type: 'encrypted',
				data: await encrypt.encryptAES128GCMWithPassword(
					codec.encode(plainGeneratorKeysSchema, defaultKeys),
					defaultPassword,
					{
						kdfparams: {
							memorySize: 2048,
						},
					},
				),
			};
		});

		describe('when only plain data is available', () => {
			it('should export plain data', async () => {
				when(invokeMock)
					.calledWith('generator_getAllKeys')
					.mockResolvedValue({
						keys: [
							{
								address,
								type: 'plain',
								data: defaultKeysJSON,
							},
						],
					});

				fileData = {
					keys: [
						{
							address,
							plain: defaultKeysJSON,
						},
					],
				};

				await ExportCommand.run(['--output=/my/path/keys.json'], config);

				expect(fs.writeJSONSync).toHaveBeenCalledTimes(1);
				expect(fs.writeJSONSync).toHaveBeenCalledWith('/my/path/keys.json', fileData, {
					spaces: ' ',
					mode: OWNER_READ_WRITE,
				});
			});
		});

		describe('when only encrypted data is available', () => {
			it('should export encrypted data', async () => {
				when(invokeMock)
					.calledWith('generator_getAllKeys')
					.mockResolvedValue({
						keys: [
							{
								address,
								type: 'encrypted',
								data: defaultEncryptedKeys.data,
							},
						],
					});

				fileData = {
					keys: [
						{
							address,
							encrypted: defaultEncryptedKeys.data,
						},
					],
				};

				await ExportCommand.run(['--output=/my/path/keys.json', '--data-path=/my/app/'], config);

				expect(fs.writeJSONSync).toHaveBeenCalledTimes(1);
				expect(fs.writeJSONSync).toHaveBeenCalledWith('/my/path/keys.json', fileData, {
					spaces: ' ',
					mode: OWNER_READ_WRITE,
				});
			});
		});
	});
});
