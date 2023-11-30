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
import * as fs from 'fs-extra';
import * as readerUtils from '../../../../src/utils/reader';
import { EncryptCommand } from '../../../../src/bootstrapping/commands/passphrase/encrypt';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';
import * as outputUtils from '../../../../src/utils/output';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('passphrase:encrypt', () => {
	const defaultKeys = {
		publicKey: Buffer.from(
			'337600533a1f734c84b738d5f634c284a80ecc8b92bae4f30c1f22f8fd001e6a',
			'hex',
		),
	};
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: '1',
	};
	const defaultInputs = {
		passphrase: 'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
		password: 'LbYpLpV9Wpec6ux8',
	};
	const consoleWarnSpy = jest.spyOn(console, 'warn');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(cryptography.legacy, 'getKeys').mockReturnValue(defaultKeys as never);
		jest
			.spyOn(cryptography.encrypt, 'encryptMessageWithPassword')
			.mockResolvedValue(encryptedPassphraseObject as never);
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'passphrase') {
				return defaultInputs.passphrase;
			}
			return '';
		});
		jest.spyOn(readerUtils, 'getPasswordFromPrompt').mockImplementation(async (name?: string) => {
			if (name === 'password') {
				return defaultInputs.password;
			}
			return '';
		});
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
	});

	describe('passphrase:encrypt', () => {
		it('should encrypt passphrase', async () => {
			await EncryptCommand.run([], config);
			const loggedData = JSON.parse(stdout[0]);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);

			expect(loggedData).toEqual({ encryptedPassphrase: encryptedPassphraseObject });
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('passphrase:encrypt --output-public-key --output=/mypath/keys.json', () => {
		it('should encrypt passphrase and output public key', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/keys.json'),
				);

			await EncryptCommand.run(['--output-public-key', '--output=/mypath/keys.json'], config);

			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledTimes(1);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'/mypath/keys.json',
				{
					encryptedPassphrase: encryptedPassphraseObject,
					publicKey: defaultKeys.publicKey.toString('hex'),
				},
				'passphrase',
				'keys.json',
			);
		});
	});

	describe('passphrase:encrypt --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"  --output=/mypath/keys.json', () => {
		it('should encrypt passphrase from passphrase flag and stdout password', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/keys.json'),
				);

			await EncryptCommand.run(
				[
					'--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
					'--output=/mypath/keys.json',
				],
				config,
			);

			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledTimes(1);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'/mypath/keys.json',
				{
					encryptedPassphrase: encryptedPassphraseObject,
				},
				'passphrase',
				'keys.json',
			);
		});
	});

	describe('passphrase:encrypt --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon" --password=LbYpLpV9Wpec6ux8  --output=/mypath/keys.json', () => {
		it('should encrypt passphrase from passphrase and password flags', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/keys.json'),
				);

			await EncryptCommand.run(
				[
					'--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
					'--password=LbYpLpV9Wpec6ux8',
					'--output=/mypath/keys.json',
				],
				config,
			);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).not.toHaveBeenCalledWith('password', true);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledTimes(1);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'/mypath/keys.json',
				{
					encryptedPassphrase: encryptedPassphraseObject,
				},
				'passphrase',
				'keys.json',
			);
		});
	});
});
