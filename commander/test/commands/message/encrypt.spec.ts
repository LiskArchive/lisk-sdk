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
	const defaultInputs =
		'tiny decrease photo key change abuse forward penalty twin foot wish expose';
	const result = {
		ciphertext:
			'3735d984bd46e476019696afd973f6eaeb591e974f99d143d9292a01a4e65dabccb7fac3091e8c3340eeb16c83d5ecc9cac627d2154efc358d4d3318358eddbca9411e20bf77113252407fc94f4fbf0330a7102a7cd990e4952d9efdf20998f72b6a51f0c17a19ffa72118ebf1114b73ee7c2227ec4d1253ecd0df33cfaa72ee68ee0ddeff72db43a98646e1e55551c261dcf263f5bec55bb84672b5b7c234ffdf9551eeb9d80cb72480adef673d1b37ba12fca26638bd5e',
		mac: '6f00f5a62b8c7e640f85e6c02c64479b5c9137fdd5e9fa38c2edcd11483ce743',
		kdf: cryptography.encrypt.KDF.ARGON2,
		kdfparams: {
			parallelism: 4,
			iterations: 1,
			memorySize: 2097023,
			salt: 'bd25ddc98eba7d8bf60a6738fca3ac23',
		},
		cipher: cryptography.encrypt.Cipher.AES256GCM,
		cipherparams: {
			iv: '1933be196b54d01fd0979294',
			tag: '11398f4dcfd776d783a35721c326f007',
		},
		version: '1',
	};

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
		jest.spyOn(cryptography.encrypt, 'encryptMessageWithPassword').mockResolvedValue(result);
	});

	describe('message:encrypt message', () => {
		it('should encrypt the message with the arg', async () => {
			await EncryptCommand.run([message, `--password=${defaultInputs}`], config);
			expect(process.stdout.write).toHaveBeenCalledWith(`${JSON.stringify(result)}\n`);
		});
	});

	describe('message:encrypt --stringify message', () => {
		it('should encrypt the message with the arg', async () => {
			await EncryptCommand.run([message, `--password=${defaultInputs}`, '--stringify'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(
				`${cryptography.encrypt.stringifyEncryptedMessage(result)}\n`,
			);
		});
	});

	describe('message:encrypt --message=file:./message.txt', () => {
		it('should decrypt the message with the arg and the message flag', async () => {
			await EncryptCommand.run(
				['--message=file:./message.txt', `--password=${defaultInputs}`],
				config,
			);
			expect(readerUtils.readFileSource).toHaveBeenCalledWith('file:./message.txt');
			expect(process.stdout.write).toHaveBeenCalledWith(`${JSON.stringify(result)}\n`);
		});
	});
});
