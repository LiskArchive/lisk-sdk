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

interface Args {
	readonly address: string;
	readonly height?: number;
	readonly maxHeightGenerated?: number;
	readonly maxHeightPrevoted?: number;
}

const isLessThanZero = (value: number | undefined | null): boolean =>
	value === null || value === undefined || value < 0;

export abstract class BaseForgingCommand extends BaseIPCClientCommand {
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

	protected forging!: boolean;

	async run(): Promise<void> {
		const { args, flags } = await this.parse(this.constructor as typeof BaseForgingCommand);
		const { address, height, maxHeightGenerated, maxHeightPrevoted } = args as Args;
		let password;

		if (
			this.forging &&
			(isLessThanZero(height) ||
				isLessThanZero(maxHeightGenerated) ||
				isLessThanZero(maxHeightPrevoted))
		) {
			throw new Error(
				'The maxHeightGenerated and maxHeightPrevoted parameter value must be greater than or equal to 0',
			);
		}

		if (flags.password) {
			password = flags.password;
		} else {
			const answers = await inquirer.prompt([
				{
					type: 'password',
					message: 'Enter password to decrypt the encrypted passphrase: ',
					name: 'password',
					mask: '*',
				},
			]);
			password = (answers as { password: string }).password;
		}
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}
		try {
			await this._client.invoke('generator_setStatus', {
				address,
				password,
				enabled: this.forging,
				height: Number(height ?? 0),
				maxHeightGenerated: Number(maxHeightGenerated ?? 0),
				maxHeightPrevoted: Number(maxHeightPrevoted ?? 0),
			});
			this.log('Status updated.');
		} catch (error) {
			this.error(error as Error);
		}
	}
}
