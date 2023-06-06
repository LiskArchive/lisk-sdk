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
import * as apiClient from '@liskhq/lisk-api-client';
import { when } from 'jest-when';
import * as fs from 'fs-extra';
import * as appUtils from '../../../../src/utils/application';
import { ExportCommand } from '../../../../src/bootstrapping/commands/generator/export';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';
import { OWNER_READ_WRITE } from '../../../../src/constants';

describe('generator:export', () => {
	const defaultPassword = 'elephant tree paris dragon chair galaxy';
	const address = utils.getRandomBytes(20).toString('hex');
	const info = [
		{
			address,
			height: 5000,
			maxHeightGenerated: 1500,
			maxHeightPrevoted: 1200,
		},
	];
	const consoleWarnSpy = jest.spyOn(console, 'warn');

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
	let allKeysPlain: any;
	let allKeysEncrypted: any;
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
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		invokeMock = jest.fn();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);

		const generatorPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(
			'passphrase',
			"m/25519'/134'/0'/0'",
		);
		const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath('passphrase', 'm/12381/134/0/0');
		defaultKeysJSON = {
			generatorKey: ed.getPublicKeyFromPrivateKey(generatorPrivateKey).toString('hex'),
			generatorPrivateKey: generatorPrivateKey.toString('hex'),
			blsPrivateKey: blsPrivateKey.toString('hex'),
			blsKey: bls.getPublicKeyFromPrivateKey(blsPrivateKey).toString('hex'),
		};
		defaultEncryptedKeys = {
			address: Buffer.from('9cabee3d27426676b852ce6b804cb2fdff7cd0b5', 'hex'),
			type: 'encrypted',
			data: await encrypt.encryptAES256GCMWithPassword(utils.getRandomBytes(32), defaultPassword, {
				kdfparams: {
					memorySize: 2048,
				},
			}),
		};
		allKeysPlain = [
			{
				address,
				type: 'plain',
				data: defaultKeysJSON,
			},
		];
		allKeysEncrypted = [
			{
				defaultEncryptedKeys,
			},
		];
	});

	describe('when exporting without a file path flag', () => {
		it('should log to the console', async () => {
			when(invokeMock).calledWith('generator_getAllKeys').mockResolvedValue({
				keys: allKeysPlain,
			});
			when(invokeMock).calledWith('generator_getStatus').mockResolvedValue({
				status: info,
			});

			await ExportCommand.run([], config);

			const loggedData = JSON.parse(stdout[0]);
			const expectedData = {
				keys: [{ address: allKeysPlain[0].address, plain: allKeysPlain[0].data }],
				generatorInfo: info,
			};

			expect(loggedData).toEqual(expectedData);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('when exporting with a file path flag and only plain data is available', () => {
		it('should export plain data', async () => {
			when(invokeMock).calledWith('generator_getAllKeys').mockResolvedValue({
				keys: allKeysPlain,
			});
			when(invokeMock).calledWith('generator_getStatus').mockResolvedValue({
				status: info,
			});
			fileData = {
				keys: [{ address: allKeysPlain[0].address, plain: allKeysPlain[0].data }],
				generatorInfo: info,
			};
			await ExportCommand.run(['--output=/my/path/info.json'], config);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith('/my/path');
			expect(fs.writeJSONSync).toHaveBeenCalledTimes(1);
			expect(fs.writeJSONSync).toHaveBeenCalledWith('/my/path/info.json', fileData, {
				spaces: ' ',
				mode: OWNER_READ_WRITE,
			});
		});
	});

	describe('when exporting with a file path flag and encrypted data is available', () => {
		it('should export encrypted data', async () => {
			when(invokeMock).calledWith('generator_getAllKeys').mockResolvedValue({
				keys: allKeysEncrypted,
			});
			when(invokeMock).calledWith('generator_getStatus').mockResolvedValue({
				status: info,
			});
			fileData = {
				keys: [{ address: allKeysEncrypted[0].address, encrypted: allKeysEncrypted[0].data }],
				generatorInfo: info,
			};
			await ExportCommand.run(['--output=/my/path/info.json', '--data-path=/my/app/'], config);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith('/my/path');
			expect(fs.writeJSONSync).toHaveBeenCalledTimes(1);
			expect(fs.writeJSONSync).toHaveBeenCalledWith('/my/path/info.json', fileData, {
				spaces: ' ',
				mode: OWNER_READ_WRITE,
			});
		});
	});
});
