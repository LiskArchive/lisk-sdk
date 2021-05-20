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

import * as Config from '@oclif/config';
import { getConfig } from '../helpers/config';
import NetworkIdentifierCommand from '../../src/commands/network-identifier';

describe('network-identifier command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;
	const networkIdentifier =
		'{"networkIdentifier":"03693f3126b9d0df3096c4ebd59e5c42af4a7f0e313cd7c96a07b6e9f8f54924"}\n';

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
	});

	describe('network-identifier', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(NetworkIdentifierCommand.run([], config)).rejects.toThrow(
				'Missing 1 required arg',
			);
		});
	});

	describe('network-identifier --community-identifier=LiskDiamond', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(
				NetworkIdentifierCommand.run(['--community-identifier=LiskDiamond'], config),
			).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('network-identifier 123', () => {
		it('should show networkIdentifier', async () => {
			await NetworkIdentifierCommand.run(['123', '-j'], config);
			expect(process.stdout.write).toHaveBeenCalledWith(networkIdentifier);
		});
	});
});
