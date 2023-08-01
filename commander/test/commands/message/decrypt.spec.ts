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
		'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=fc17353ac21dbdaa8b2c8a09d1ee7ded3e64559922d679e7fd382ac403247bd41389d32c7bc98bfa8f74a141b3946549b0d4ecdc995f130b321274484784f7bc4ac383491cb1010ead36abf91f0cf8be&mac=61792857203a0860c12ff9ed8dcb70db7240f1dfb28d6ddb8c7478e23c1fe029&salt=35e8e6305e6577f0&iv=bc47f1c691d2e60e59ba6e54a78442fe&tag=965a1c13309a5272d1bdf84090736f9e&iterations=1&parallelism=4&memorySize=2097023';
	const result =
		'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol\n';
	const defaultInputs = 'testpassword';

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
