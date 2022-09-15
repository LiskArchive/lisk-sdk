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

import * as readerUtils from '../../../../src/utils/reader';
import { EncryptCommand } from '../../../../src/bootstrapping/commands/passphrase/encrypt';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('passphrase:encrypt', () => {
	const encryptedPassphraseString =
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1';
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
		jest.spyOn(EncryptCommand.prototype, 'printJSON').mockReturnValue();
		jest.spyOn(cryptography.legacy, 'getKeys').mockReturnValue(defaultKeys as never);
		jest
			.spyOn(cryptography.encrypt, 'encryptMessageWithPassword')
			.mockResolvedValue(encryptedPassphraseObject as never);
		jest
			.spyOn(cryptography.encrypt, 'stringifyEncryptedMessage')
			.mockReturnValue(encryptedPassphraseString);
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
	});

	describe('passphrase:encrypt', () => {
		it('should encrypt passphrase', async () => {
			await EncryptCommand.run([], config);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(cryptography.encrypt.stringifyEncryptedMessage).toHaveBeenCalledWith(
				encryptedPassphraseObject,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);

			expect(EncryptCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					encryptedPassphrase: encryptedPassphraseString,
				},
				undefined,
			);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('passphrase:encrypt --output-public-key', () => {
		it('should encrypt passphrase and output public key', async () => {
			await EncryptCommand.run(['--output-public-key'], config);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(cryptography.encrypt.stringifyEncryptedMessage).toHaveBeenCalledWith(
				encryptedPassphraseObject,
			);
			expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);
			expect(EncryptCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					encryptedPassphrase: encryptedPassphraseString,
					publicKey: defaultKeys.publicKey.toString('hex'),
				},
				undefined,
			);
		});
	});

	describe('passphrase:encrypt --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon"', () => {
		it('should encrypt passphrase from passphrase flag and stdout password', async () => {
			await EncryptCommand.run(
				['--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon'],
				config,
			);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(cryptography.encrypt.stringifyEncryptedMessage).toHaveBeenCalledWith(
				encryptedPassphraseObject,
			);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);
			expect(EncryptCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					encryptedPassphrase: encryptedPassphraseString,
				},
				undefined,
			);
		});
	});

	describe('passphrase:encrypt --passphrase="enemy pill squeeze gold spoil aisle awake thumb congress false box wagon" --password=LbYpLpV9Wpec6ux8', () => {
		it('should encrypt passphrase from passphrase and password flags', async () => {
			await EncryptCommand.run(
				[
					'--passphrase=enemy pill squeeze gold spoil aisle awake thumb congress false box wagon',
					'--password=LbYpLpV9Wpec6ux8',
				],
				config,
			);
			expect(cryptography.encrypt.encryptMessageWithPassword).toHaveBeenCalledWith(
				defaultInputs.passphrase,
				defaultInputs.password,
			);
			expect(cryptography.encrypt.stringifyEncryptedMessage).toHaveBeenCalledWith(
				encryptedPassphraseObject,
			);
			expect(readerUtils.getPassphraseFromPrompt).not.toHaveBeenCalledWith('passphrase', true);
			expect(readerUtils.getPasswordFromPrompt).not.toHaveBeenCalledWith('password', true);
			expect(EncryptCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					encryptedPassphrase: encryptedPassphraseString,
				},
				undefined,
			);
		});
	});
});
