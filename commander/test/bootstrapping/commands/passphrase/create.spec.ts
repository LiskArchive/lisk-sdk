/*
 * LiskHQ/lisk-commander
 * Copyright © 2022 Lisk Foundation
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

import { Mnemonic } from '@liskhq/lisk-passphrase';
import * as fs from 'fs-extra';
import { CreateCommand } from '../../../../src/bootstrapping/commands/passphrase/create';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';
import * as outputUtils from '../../../../src/utils/output';

describe('passphrase:create command', () => {
	const consoleWarnSpy = jest.spyOn(console, 'warn');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();

		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'writeJSONSync').mockReturnValue();
		jest.spyOn(Mnemonic, 'generateMnemonic');
	});

	describe('keys:create', () => {
		it('should create valid passphrase', async () => {
			await CreateCommand.run([], config);
			const loggedData = JSON.parse(stdout[0]);

			expect(Mnemonic.generateMnemonic).toHaveBeenCalledTimes(1);
			expect(loggedData.passphrase).toBeDefined();
			expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
		});
	});

	describe('keys:create --output /tmp/passphrase.json', () => {
		it('should create valid passphrase', async () => {
			jest
				.spyOn(outputUtils, 'handleOutputFlag')
				.mockImplementation(async () =>
					Promise.resolve('Successfully written data to /my/path/passphrase.json'),
				);

			await CreateCommand.run(['--output=/tmp/passphrase.json'], config);

			expect(outputUtils.handleOutputFlag).toHaveBeenCalledTimes(1);
			expect(outputUtils.handleOutputFlag).toHaveBeenCalledWith(
				'/tmp/passphrase.json',
				{ passphrase: expect.any(String) },
				'passphrase',
			);
		});
	});
});
