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
import { encrypt } from '@liskhq/lisk-cryptography';
import { getConfig } from '../../helpers/config';
import DecryptCommand from '../../../src/commands/message/decrypt';
import * as readerUtils from '../../../src/utils/reader';
import { Awaited } from '../../types';

describe('message:decrypt', () => {
	const defaultEncryptedMessage =
		'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=023fd9427f&mac=647457ac72dbc5e567e8f9ca173ddd457909ed2f45aa080daac78078a1293e8e&salt=82c1f80fbd9500aa1421f1e491cd46d4&iv=3265e728a4b6015087616385&tag=86e2bf01ba81c0079345ae8eb5ac1704&iterations=1&parallelism=4&memorySize=2024';
	const result = 'hello\n';
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
		jest
			.spyOn(readerUtils, 'readFileSource')
			.mockResolvedValue(JSON.stringify(encrypt.parseEncryptedMessage(defaultEncryptedMessage)));
		jest
			.spyOn(inquirer, 'prompt')
			.mockResolvedValue({ passphrase: defaultInputs, passphraseRepeat: defaultInputs });
	});

	describe('message:decrypt', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(DecryptCommand.run([], config)).rejects.toThrow(
				'Message must be provided through the argument or the flag',
			);
		});
	});

	describe('message:decrypt message', () => {
		it('should decrypt the message with the arg', async () => {
			await DecryptCommand.run([defaultEncryptedMessage], config);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});

	describe('message:decrypt --message=file:./message.txt', () => {
		it('should decrypt the message with the arg and the message flag', async () => {
			await DecryptCommand.run(
				['--message=file:./message.txt', `--password=${defaultInputs}`],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});
});
