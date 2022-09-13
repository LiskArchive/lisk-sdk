/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import * as inquirer from 'inquirer';
import * as cryptography from '@liskhq/lisk-cryptography';
import { getConfig } from '../../helpers/config';
import EncryptCommand from '../../../src/commands/message/encrypt';
import * as readerUtils from '../../../src/utils/reader';
import { Awaited } from '../../types';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('message:encrypt', () => {
	const message = 'hello';
	const defaultRecipientPublicKey =
		'fd061b9146691f3c56504be051175d5b76d1b1d0179c5c4370e18534c5882122';
	const defaultEncryptedMessage = {
		nonce: '370729c20ee2080cdcea9e9f12abb3221fcc502fa3aa7d79',
		message: '6f6daa36cb5f436d3e401bc8f52d649b8299e6e731',
	};
	const defaultInputs =
		'tiny decrease photo key change abuse forward penalty twin foot wish expose';
	const result =
		'{"encryptedMessage":"6f6daa36cb5f436d3e401bc8f52d649b8299e6e731","nonce":"370729c20ee2080cdcea9e9f12abb3221fcc502fa3aa7d79","recipientPublicKey":"fd061b9146691f3c56504be051175d5b76d1b1d0179c5c4370e18534c5882122"}\n';

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({ passphrase: defaultInputs });
		jest.spyOn(readerUtils, 'readFileSource').mockResolvedValue(message);
		jest.spyOn(cryptography.encrypt, 'encryptMessageWithPrivateKey').mockReturnValue({
			encryptedMessage: defaultEncryptedMessage.message,
			nonce: defaultEncryptedMessage.nonce,
		});
	});

	it('should throw an error when arg is not provided', async () => {
		await expect(EncryptCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
	});

	describe('message:encrypt recipientPublicKey', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(EncryptCommand.run([defaultRecipientPublicKey], config)).rejects.toThrow(
				'No message was provided.',
			);
		});
	});

	describe('message:encrypt recipientPublicKey message', () => {
		it('should encrypt the message with the arg', async () => {
			await EncryptCommand.run(
				[defaultRecipientPublicKey, message, `--passphrase=${defaultInputs}`, '-j'],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});

	describe('message:encrypt recipientPublicKey --message=file:./message.txt', () => {
		it('should decrypt the message with the arg and the message flag', async () => {
			await EncryptCommand.run(
				[
					defaultRecipientPublicKey,
					'--message=file:./message.txt',
					`--passphrase=${defaultInputs}`,
					'-j',
				],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});
});
