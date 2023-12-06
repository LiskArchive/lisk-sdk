/*
 * Copyright © 2021 Lisk Foundation
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

import * as fs from 'fs-extra';
import * as cryptography from '@liskhq/lisk-cryptography';
import { HashOnionCommand } from '../../../src/bootstrapping/commands/hash-onion';
import { getConfig } from '../../helpers/config';
import { Awaited } from '../../types';
import * as outputUtils from '../../../src/utils/output';

describe('hash-onion command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(HashOnionCommand.prototype, 'printJSON').mockReturnValue();
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
	});

	describe('hash-onion --count=1000 --distance=200', () => {
		it('should generate valid hash onion', async () => {
			await HashOnionCommand.run(['--count=1000', '--distance=200'], config);
			const { length } = (HashOnionCommand.prototype.printJSON as jest.Mock).mock.calls;
			const result = (HashOnionCommand.prototype.printJSON as jest.Mock).mock.calls[length - 1][0];
			for (let i = 0; i < result.hashes.length - 1; i += 1) {
				let nextHash = Buffer.from(result.hashes[i + 1], 'hex');
				for (let j = 0; j < result.distance; j += 1) {
					nextHash = cryptography.utils.hash(nextHash).subarray(0, 16);
				}
				expect(result.hashes[i]).toBe(nextHash.toString('hex'));
			}
		});
	});

	describe('hash-onion --count=1000 --distance=200 --output=./test/sample.json', () => {
		it('should write to file', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/sample.json'),
				);

			await HashOnionCommand.run(
				['--count=1000', '--distance=200', '--output=./test/sample.json'],
				config,
			);

			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'./test/sample.json',
				expect.anything(),
				'hash-onion',
			);
		});

		it('should write to file in pretty format', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/sample.json'),
				);

			await HashOnionCommand.run(
				['--count=1000', '--distance=200', '--pretty', '--output=./test/sample.json'],
				config,
			);

			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'./test/sample.json',
				expect.anything(),
				'hash-onion',
			);
		});
	});

	describe('hash-onion --count=777 --distance=200', () => {
		it('should throw an error', async () => {
			await expect(HashOnionCommand.run(['--count=777', '--distance=200'], config)).rejects.toThrow(
				'Invalid count. Count must be multiple of distance',
			);
		});
	});

	describe('hash-onion --count=100 --distance=200', () => {
		it('should throw an error', async () => {
			await expect(HashOnionCommand.run(['--count=100', '--distance=200'], config)).rejects.toThrow(
				'Invalid count or distance. Count must be greater than distance',
			);
		});
	});

	describe('hash-onion --count=-1 --distance=200', () => {
		it('should throw an error', async () => {
			await expect(HashOnionCommand.run(['--count=-1', '--distance=200'], config)).rejects.toThrow(
				'Count flag must be an integer and greater than 0.',
			);
		});
	});

	describe('hash-onion --count=1000 --distance=-1', () => {
		it('should throw an error', async () => {
			await expect(HashOnionCommand.run(['--count=1000', '--distance=-1'], config)).rejects.toThrow(
				'Distance flag must be an integer and greater than 0.',
			);
		});
	});
});
