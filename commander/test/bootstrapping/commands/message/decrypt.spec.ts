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
import { getConfig } from '../../../helpers/config';
import { DecryptCommand } from '../../../../src/commands/message/decrypt';
import * as readerUtils from '../../../../src/utils/reader';
import { Awaited } from '../../../types';

describe('message:decrypt', () => {
	const defaultEncryptedMessage =
		'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=31b2cec3ca4585d4503b46444f5836b948d875367a5f5fc08bc4ca424db60acb4a86ab98f8dd4dd73f5589ede1b8c5abc16eb73561b48aab422dd6e716b97c91721a781e3e8acfdb39c0a7f41fd23ba8&mac=bfdf26800dab13a8e88ee7fa90fcd6d43459e762fe811b3be3664537df36c026&salt=e3db480467e4e61e&iv=11af231d8cbbe77d09e515f1b3308c57&tag=81b20ab2154678a020412a8459d79554&iterations=1&parallelism=4&memorySize=2024';
	const defaultInputs = 'testpassword';
	const result =
		'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol\n';

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
