/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import config from '../utils/env';
import commonOptions from '../utils/options';
import query from '../utils/query';
import { printResult } from '../utils/print';
import {
	COMMAND_TYPES,
	SINGULARS,
} from '../utils/constants';
import {
	deAlias,
	shouldUseJsonOutput,
} from '../utils/helpers';

const handlers = {
	addresses: address => query.isAccountQuery(address),
	accounts: accounts => query.isAccountQuery(accounts),
	blocks: blocks => query.isBlockQuery(blocks),
	delegates: delegates => query.isDelegateQuery(delegates),
	transactions: transactions => query.isTransactionQuery(transactions),
};

const processResults = (useJsonOutput, vorpal, type, results) => {
	const resultsToPrint = results.map(result => (
		result.error
			? result
			: result[type]
	));
	return printResult(vorpal, { json: useJsonOutput })(resultsToPrint);
};

const list = vorpal => ({ type, variadic, options }) => {
	const singularType = SINGULARS[type];
	const useJsonOutput = shouldUseJsonOutput(config, options);

	const makeCalls = () => variadic.map(input => handlers[type](input));

	return COMMAND_TYPES.includes(singularType)
		? Promise.all(makeCalls())
			.then(processResults.bind(null, useJsonOutput, vorpal, deAlias(singularType)))
			.catch(e => e)
		: Promise.resolve(vorpal.activeCommand.log('Unsupported type.'));
};

export default function listCommand(vorpal) {
	vorpal
		.command('list <type> <variadic...>')
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description('Get information from <type> with parameters <input, input, ...>.\n  Types available: accounts, addresses, blocks, delegates, transactions\n  Example: list delegates lightcurve tosch\n  Example: list blocks 5510510593472232540 16450842638530591789')
		.autocomplete(COMMAND_TYPES)
		.action(list(vorpal));
}
