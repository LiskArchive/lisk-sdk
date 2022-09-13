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
import SignCommand from '../../../src/commands/message/sign';
import * as readerUtils from '../../../src/utils/reader';
import { Awaited } from '../../types';

describe('message:sign', () => {
	const messageSource = 'file:/message.txt';
	const message = 'Hello World';
	const defaultInputs =
		'card earn shift valley learn scorpion cage select help title control satoshi';
	const result =
		'{"message":"Hello World","publicKey":"f1f9fb8717a6a3cc1213221e4bc3426e547407150947272e4f4b729a61726437","signature":"314ff25bac109af267009d1f731426eb7d15569e2c3f5284b93ed46986667cc3d4c9413add24072bfad74a347630a6bf395dc746a1adfc663c7a6a2cafa8540c"}\n';

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(readerUtils, 'readFileSource').mockResolvedValue(message);
		jest
			.spyOn(inquirer, 'prompt')
			.mockResolvedValue({ passphrase: defaultInputs, passphraseRepeat: defaultInputs });
	});

	describe('message:sign', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(SignCommand.run([], config)).rejects.toThrow('No message was provided.');
		});
	});

	describe('message:sign message', () => {
		it('should sign the message with the arg', async () => {
			await SignCommand.run([message, '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});

	describe('message:sign --message=file:./message.txt', () => {
		it('should sign the message from flag', async () => {
			await SignCommand.run([message, `--message=${messageSource}`, '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});

	describe('message:sign --message=file:./message.txt --passphrase=xxx', () => {
		it('should sign the message from the flag and passphrase', async () => {
			await SignCommand.run(
				[message, `--message=${messageSource}`, `--passphrase=${defaultInputs}`, '-j'],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});
});
