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
import { getConfig } from '../../helpers/config';
import VerifyCommand from '../../../src/commands/message/verify';
import * as readerUtils from '../../../src/utils/reader';
import { Awaited } from '../../types';

describe('message:verify', () => {
	const message = 'Hello World';
	const publicKey = 'f1f9fb8717a6a3cc1213221e4bc3426e547407150947272e4f4b729a61726437';
	const signature =
		'48f2d8142b7d4834c68eae836cc0d44b31ca05ad91b8d3f96f1779626d187df89059cab3bf7bc466040578bba7497b6255002b749348c96fe76315496434a90c';
	const defaultVerifyMessageResult = '{"verified":true}\n';
	const messageSource = 'file:/message.txt';

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
	});

	describe('message:verify', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(VerifyCommand.run([], config)).rejects.toThrow('Missing 2 required arg');
		});
	});

	describe('message:verify publicKey', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(VerifyCommand.run([publicKey], config)).rejects.toThrow(
				'Missing 1 required arg',
			);
		});
	});

	describe('message:verify publicKey signature', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(VerifyCommand.run([publicKey, signature], config)).rejects.toThrow(
				'No message was provided.',
			);
		});
	});

	describe('message:verify publicKey signature message', () => {
		it('should verify message from the arg', async () => {
			await VerifyCommand.run([publicKey, signature, message, '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(defaultVerifyMessageResult);
		});
	});

	describe('message:verify publicKey signature --message=file:./message.txt', () => {
		it('should verify message from the flag', async () => {
			await VerifyCommand.run([publicKey, signature, `--message=${messageSource}`, '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(defaultVerifyMessageResult);
		});
	});
});
