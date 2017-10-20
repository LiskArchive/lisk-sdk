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
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';

export const deAlias = type => (
	type === 'address'
		? 'account'
		: type
);

export const shouldUseJsonOutput = (config, options) =>
	(options.json === true || config.json === true)
		&& options.json !== false;

export const createErrorHandler = prefix => ({ message }) => ({
	error: `${prefix}: ${message}`,
});

export const wrapActionCreator = (vorpal, actionCreator, errorPrefix) => parameters =>
	actionCreator(vorpal)(parameters)
		.catch(createErrorHandler(errorPrefix))
		.then(printResult(vorpal, parameters.options));

export const createCommand = ({
	command,
	autocomplete,
	description,
	actionCreator,
	options = [],
	errorPrefix,
	alias,
}) => function createdCommand(vorpal) {
	const action = wrapActionCreator(vorpal, actionCreator, errorPrefix);
	const commandInstance = vorpal
		.command(command)
		.autocomplete(autocomplete)
		.description(description)
		.action(action);

	if (alias) commandInstance.alias(alias);

	[
		...options,
		commonOptions.json,
		commonOptions.noJson,
	].forEach(option => commandInstance.option(...option));
};
