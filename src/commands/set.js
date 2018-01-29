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
import { CONFIG_VARIABLES } from '../utils/constants';
import config, { configFilePath } from '../utils/config';
import { FileSystemError, ValidationError } from '../utils/error';
import { writeJSONSync } from '../utils/fs';
import { createCommand } from '../utils/helpers';

const availableVariables = CONFIG_VARIABLES.join(', ');
const description = `Sets configuration <variable> to <value>. Variables available: ${availableVariables}. Configuration is persisted in \`${configFilePath}\`.

	Examples:
	- set json true
	- set name my_custom_lisky
	- set liskJS.testnet true
`;

const WRITE_FAIL_WARNING =
	'Config file could not be written: your changes will not be persisted.';

const writeConfigToFile = newConfig => {
	try {
		writeJSONSync(configFilePath, newConfig);
		return true;
	} catch (e) {
		return false;
	}
};

const checkBoolean = value => ['true', 'false'].includes(value);

const setNestedConfigProperty = newValue => (
	obj,
	pathComponent,
	i,
	dotNotationArray,
) => {
	if (i === dotNotationArray.length - 1) {
		// eslint-disable-next-line no-param-reassign
		obj[pathComponent] = newValue;
		return config;
	}
	return obj[pathComponent];
};

const attemptWriteToFile = (value, dotNotationArray) => {
	const writeSuccess = writeConfigToFile(config);

	if (!writeSuccess && process.env.NON_INTERACTIVE_MODE === 'true') {
		throw new FileSystemError(WRITE_FAIL_WARNING);
	}

	const result = {
		message: `Successfully set ${dotNotationArray.join('.')} to ${value}.`,
	};

	if (!writeSuccess) {
		result.warning = WRITE_FAIL_WARNING;
	}

	return result;
};

const setBoolean = dotNotation => value => {
	if (!checkBoolean(value)) {
		throw new ValidationError('Value must be a boolean.');
	}
	const dotNotationArray = dotNotation.split('.');
	const newValue = value === 'true';
	dotNotationArray.reduce(setNestedConfigProperty(newValue), config);

	return attemptWriteToFile(value, dotNotationArray);
};

const setString = dotNotation => value => {
	const dotNotationArray = dotNotation.split('.');
	dotNotationArray.reduce(setNestedConfigProperty(value), config);
	return attemptWriteToFile(value, dotNotationArray);
};

const handlers = {
	json: setBoolean('json'),
	name: setString('name'),
	pretty: setBoolean('pretty'),
	'liskJS.testnet': setBoolean('liskJS.testnet'),
	'liskJS.ssl': setBoolean('liskJS.ssl'),
	'liskJS.node': setString('liskJS.node'),
	'liskJS.port': setString('liskJS.port'),
};

export const actionCreator = () => async ({ variable, value }) => {
	if (!CONFIG_VARIABLES.includes(variable)) {
		throw new ValidationError('Unsupported variable name.');
	}

	return handlers[variable](value);
};

const set = createCommand({
	command: 'set <variable> <value>',
	autocomplete: CONFIG_VARIABLES,
	description,
	actionCreator,
	errorPrefix: 'Could not set config variable',
});

export default set;
