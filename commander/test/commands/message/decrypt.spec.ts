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
import { getConfig } from '../../helpers/config';
import DecryptCommand from '../../../src/commands/message/decrypt';
import * as readerUtils from '../../../src/utils/reader';
import { Awaited } from '../../types';

describe('message:decrypt', () => {
	const defaultSenderPublicKey = 'fd061b9146691f3c56504be051175d5b76d1b1d0179c5c4370e18534c5882122';
	const defaultNonce = 'b3e80b6a6da64c8ab61ca6503b244daacbee59a33c5408c4';
	const defaultEncryptedMessage = '0529c0113b93af6f9a851d47062e94cfb77101cc0e';
	const result = '{"message":"hello"}\n';
	const defaultInputs =
		'tiny decrease photo key change abuse forward penalty twin foot wish expose';

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(readerUtils, 'readFileSource').mockResolvedValue(defaultEncryptedMessage);
		jest
			.spyOn(inquirer, 'prompt')
			.mockResolvedValue({ passphrase: defaultInputs, passphraseRepeat: defaultInputs });
	});

	it('should throw an error when arg is not provided', async () => {
		await expect(DecryptCommand.run([], config)).rejects.toThrow('Missing 2 required arg');
	});

	describe('message:decrypt senderPublicKey', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(DecryptCommand.run([defaultSenderPublicKey], config)).rejects.toThrow(
				'Missing 1 required arg',
			);
		});
	});

	describe('message:decrypt senderPublicKey nonce', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(
				DecryptCommand.run([defaultSenderPublicKey, defaultNonce], config),
			).rejects.toThrow('No message was provided.');
		});
	});

	describe('message:decrypt senderPublicKey nonce message', () => {
		it('should decrypt the message with the arg', async () => {
			await DecryptCommand.run(
				[defaultSenderPublicKey, defaultNonce, defaultEncryptedMessage, '-j'],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});

	describe('message:decrypt senderPublicKey nonce --message=file:./message.txt', () => {
		it('should decrypt the message with the arg and the message flag', async () => {
			await DecryptCommand.run(
				[
					defaultSenderPublicKey,
					defaultNonce,
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
