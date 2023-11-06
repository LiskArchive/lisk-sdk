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

import * as inquirer from 'inquirer';
import { flagsWithParser } from '../../utils/flags';
import { BaseIPCClientCommand } from './base_ipc_client';

export abstract class BaseGeneratorCommand extends BaseIPCClientCommand {
	static args = [
		{
			name: 'address',
			required: true,
			description: 'Address of an account in a lisk32 format.',
		},
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		password: flagsWithParser.password,
	};

	protected async getPassword(
		parsedFlags: Awaited<ReturnType<typeof BaseGeneratorCommand.prototype.parse>>['flags'],
	): Promise<string> {
		if (parsedFlags.password) {
			return parsedFlags.password as string;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const answers = await inquirer.prompt([
			{
				type: 'password',
				message: 'Enter password to decrypt the encrypted passphrase: ',
				name: 'password',
				mask: '*',
			},
		]);
		return (answers as { password: string }).password;
	}
}
