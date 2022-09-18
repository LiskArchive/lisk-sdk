/*
 * LiskHQ/lisk-commander
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
import { ValidateCommand } from '../../../../src/bootstrapping/commands/account/validate';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('account:validate', () => {
	const validAddress = 'lskso9zqyapuhu8kv7txfbohwrhjfbd4gkxewcuxz';
	const invalidAddress = validAddress.replace('wr', 'om');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		config = await getConfig();
	});

	describe('account:validate', () => {
		it('should show address is valid', async () => {
			await ValidateCommand.run([validAddress], config);
			expect(stdout[0]).toContain('is a valid lisk32 address');
		});

		it('should show address is invalid', async () => {
			await expect(ValidateCommand.run([invalidAddress], config)).rejects.toThrow(
				'Invalid checksum for address',
			);
		});
	});
});
