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
import { Command } from '@oclif/core';
import * as cryptography from '@liskhq/lisk-cryptography';

interface Args {
	readonly address: string;
}

export class ValidateCommand extends Command {
	static description = 'Validate lisk32 address.';

	static examples = ['account:validate lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g'];

	static args = [
		{
			name: 'address',
			required: true,
			description: 'Address in base32 format to validate.',
		},
	];

	async run(): Promise<void> {
		const { args } = await this.parse(ValidateCommand);
		const { address } = args as Args;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			cryptography.address.validateLisk32Address(address, this.config.pjson.lisk.addressPrefix);
			this.log(`Address ${address} is a valid lisk32 address`);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			this.error(error.message);
		}
	}
}
