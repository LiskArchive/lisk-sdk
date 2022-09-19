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
	const defaultPublicKey = 'fd061b9146691f3c56504be051175d5b76d1b1d0179c5c4370e18534c5882122';
	const defaultSignature =
		'b24c548d8f39baa0d48ca4ee6069f76cde12f495632553e4a4ec55bced5344125787887c5a34caa1d78dd7b864f0446d228bbbaf23b1bb75e9c45a0bfb912b0a';
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
			await expect(VerifyCommand.run([defaultPublicKey], config)).rejects.toThrow(
				'Missing 1 required arg',
			);
		});
	});

	describe('message:verify publicKey signature', () => {
		it('should throw an error when message is not provided', async () => {
			await expect(VerifyCommand.run([defaultPublicKey, defaultSignature], config)).rejects.toThrow(
				'No message was provided.',
			);
		});
	});

	describe('message:verify publicKey signature message', () => {
		it('should verify message from the arg', async () => {
			await VerifyCommand.run([defaultPublicKey, defaultSignature, message, '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(defaultVerifyMessageResult);
		});
	});

	describe('message:verify publicKey signature --message=file:./message.txt', () => {
		it('should verify message from the flag', async () => {
			await VerifyCommand.run(
				[defaultPublicKey, defaultSignature, `--message=${messageSource}`, '-j'],
				config,
			);
			expect(process.stdout.write).toHaveBeenCalledWith(defaultVerifyMessageResult);
		});
	});
});
