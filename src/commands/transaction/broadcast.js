/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { ValidationError } from '../../utils/error';
import { getRawStdIn } from '../../utils/input/utils';
import getAPIClient from '../../utils/api';

const getTransactionInput = async () =>
	getRawStdIn()
		.then(rawStdIn => {
			if (rawStdIn.length <= 0) {
				throw new ValidationError('No transaction was provided.');
			}
			return rawStdIn[0];
		})
		.catch(() => {
			throw new ValidationError('No transaction was provided.');
		});

export default class BroadcastCommand extends BaseCommand {
	async run() {
		const { args: { transaction } } = this.parse(BroadcastCommand);
		const transactionInput =
			transaction || (await getTransactionInput(transaction));
		let transactionObject;
		try {
			transactionObject = JSON.parse(transactionInput);
		} catch (error) {
			throw new ValidationError(
				'Could not parse transaction JSON. Did you use the `--json` option?',
			);
		}
		const client = getAPIClient(this.userConfig.api);
		const response = await client.transactions.broadcast(transactionObject);
		this.print(response.data);
	}
}

BroadcastCommand.args = [
	{
		name: 'transaction',
		description: 'Transaction to broadcast.',
	},
];

BroadcastCommand.flags = {
	...BaseCommand.flags,
};

BroadcastCommand.description = `
Broadcasts a transaction to the network via the node specified in the current config.
Accepts a stringified JSON transaction as an argument, or a transaction can be piped from a previous command.
If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.
`;

BroadcastCommand.examples = [
	'broadcast transaction \'{"type":0,"amount":"100",...}\'',
	'echo \'{"type":0,"amount":"100",...}\' | lisk transaction:broadcast',
];
