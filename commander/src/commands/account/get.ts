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
import BaseCommand from '../../base';
import { getAPIClient } from '../../utils/api';
import { query } from '../../utils/query';

interface Args {
	readonly addresses: string;
}

export default class GetCommand extends BaseCommand {
	static args = [
		{
			name: 'addresses',
			required: true,
			description: 'Comma-separated address(es) to get information about.',
		},
	];

	static description = `
		Gets account information from the blockchain.
	`;

	static examples = [
		'account:get 3520445367460290306L',
		'account:get 3520445367460290306L,2802325248134221536L',
	];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = this.parse(GetCommand);
		const { addresses: addressesStr }: Args = args;
		const addresses = addressesStr.split(',').filter(Boolean);
		const req = addresses.map((address: string) => ({
			query: {
				limit: 1,
				address,
			},
			placeholder: {
				address,
				message: 'Address not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'accounts', req);
		this.print(results);
	}
}
