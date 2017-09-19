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
import { COMMAND_TYPES } from '../utils/constants';
import { printResult } from '../utils/print';
import {
	deAlias,
	shouldUseJsonOutput,
} from '../utils/helpers';

const handlers = {
	account: account => query.isAccountQuery(account),
	address: address => query.isAccountQuery(address),
	block: block => query.isBlockQuery(block),
	delegate: delegate => query.isDelegateQuery(delegate),
	transaction: transaction => query.isTransactionQuery(transaction),
};

const processResult = (useJsonOutput, vorpal, type, result) => {
	const resultToPrint = result.error ? result : result[type];
	return printResult(vorpal, { json: useJsonOutput })(resultToPrint);
};

const get = vorpal => ({ options, type, input }) => {
	const useJsonOutput = shouldUseJsonOutput(config, options);
	return COMMAND_TYPES.includes(type)
		? handlers[type](input)
			.then(processResult.bind(null, useJsonOutput, vorpal, deAlias(type)))
		: Promise.resolve(vorpal.activeCommand.log('Unsupported type.'));
};

export default function getCommand(vorpal) {
	vorpal
		.command('get <type> <input>')
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description('Get information from <type> with parameter <input>.\n  Types available: account, address, block, delegate, transaction\n  Example: get delegate lightcurve\n  Example: get block 5510510593472232540')
		.autocomplete(COMMAND_TYPES)
		.action(get(vorpal));
}
