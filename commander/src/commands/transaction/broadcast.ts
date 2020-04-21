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
import { ValidationError } from '../../utils/error';
import { readStdIn } from '../../utils/reader';
import { parseTransactionString } from '../../utils/transactions';

const getTransactionInput = async (): Promise<string> => {
	try {
		const lines = await readStdIn();
		if (!lines.length) {
			throw new ValidationError('No transaction was provided.');
		}

		return lines[0];
	} catch (e) {
		throw new ValidationError('No transaction was provided.');
	}
};

export default class BroadcastCommand extends BaseCommand {
	static args = [
		{
			name: 'transaction',
			description: 'Transaction to broadcast in JSON format.',
		},
	];

	static description = `
	Broadcasts a transaction to the network via the node specified in the current config.
	Accepts a stringified JSON transaction as an argument, or a transaction can be piped from a previous command.
	If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.
	`;

	static examples = [
		'broadcast transaction \'{"type":0,"amount":"100",...}\'',
		'echo \'{"type":0,"amount":"100",...}\' | lisk transaction:broadcast',
	];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { transaction },
		} = this.parse(BroadcastCommand);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const transactionInput = transaction || (await getTransactionInput());
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const transactionObject = parseTransactionString(transactionInput);
		const client = getAPIClient(this.userConfig.api);
		const response = await client.transactions.broadcast(transactionObject);
		this.print(response.data);
	}
}
