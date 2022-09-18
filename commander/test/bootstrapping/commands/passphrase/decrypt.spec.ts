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
import { DecryptCommand } from '../../../../src/bootstrapping/commands/passphrase/decrypt';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('passphrase:decrypt', () => {
	const defaultEncryptedPassphrase =
		'salt=d3887df959ed2bfe5961a6831da6e177&cipherText=1c08a1&iv=096ede534df9092fd4523ec7&tag=2a055e1c860b3ef76084a6c9aca68ce9&version=1';
	const passphrase = 'enemy pill squeeze gold spoil aisle awake thumb congress false box wagon';
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: '1',
	};
	const defaultInputs = 'LbYpLpV9Wpec6ux8';

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(DecryptCommand.prototype, 'printJSON').mockReturnValue();
		jest
			.spyOn(cryptography.encrypt, 'parseEncryptedMessage')
			.mockReturnValue(encryptedPassphraseObject as never);
		jest
			.spyOn(cryptography.encrypt, 'decryptMessageWithPassword')
			.mockResolvedValue(passphrase as never);
		jest.spyOn(readerUtils, 'getPasswordFromPrompt').mockResolvedValue(defaultInputs);
	});

	describe('passphrase:decrypt', () => {
		it('should throw an error', async () => {
			await expect(DecryptCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('passphrase:decrypt encryptedPassphrase', () => {
		it('should decrypt passphrase with arg', async () => {
			await DecryptCommand.run([defaultEncryptedPassphrase], config);
			expect(readerUtils.getPasswordFromPrompt).toHaveBeenCalledWith('password', true);
			expect(cryptography.encrypt.parseEncryptedMessage).toHaveBeenCalledWith(
				defaultEncryptedPassphrase,
			);
			expect(cryptography.encrypt.decryptMessageWithPassword).toHaveBeenCalledWith(
				encryptedPassphraseObject,
				defaultInputs,
				'utf-8',
			);
			expect(DecryptCommand.prototype.printJSON).toHaveBeenCalledWith({ passphrase }, undefined);
		});
	});

	describe('passphrase:decrypt --password=LbYpLpV9Wpec6ux8', () => {
		it('should decrypt passphrase with passphrase flag and password flag', async () => {
			await DecryptCommand.run([defaultEncryptedPassphrase, '--password=LbYpLpV9Wpec6ux8'], config);
			expect(readerUtils.getPasswordFromPrompt).not.toHaveBeenCalled();
			expect(cryptography.encrypt.parseEncryptedMessage).toHaveBeenCalledWith(
				defaultEncryptedPassphrase,
			);
			expect(cryptography.encrypt.decryptMessageWithPassword).toHaveBeenCalledWith(
				encryptedPassphraseObject,
				defaultInputs,
				'utf-8',
			);
			expect(DecryptCommand.prototype.printJSON).toHaveBeenCalledWith(
				{
					passphrase,
				},
				undefined,
			);
		});
	});
});
