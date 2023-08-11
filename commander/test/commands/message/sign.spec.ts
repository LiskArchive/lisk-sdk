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
	const passphrase = 'card earn shift valley learn scorpion cage select help title control satoshi';
	const result =
		'{"message":"Hello World","publicKey":"f1f9fb8717a6a3cc1213221e4bc3426e547407150947272e4f4b729a61726437","signature":"48f2d8142b7d4834c68eae836cc0d44b31ca05ad91b8d3f96f1779626d187df89059cab3bf7bc466040578bba7497b6255002b749348c96fe76315496434a90c"}\n';

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
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({ passphrase, passphraseRepeat: passphrase });
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
				[message, `--message=${messageSource}`, `--passphrase=${passphrase}`, '-j'],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(result);
		});
	});
});
