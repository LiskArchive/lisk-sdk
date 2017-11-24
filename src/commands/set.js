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
import { writeJsonSync } from '../utils/fs';
import { createCommand } from '../utils/helpers';
import liskAPIInstance from '../utils/api';

const description = `Sets configuration <variable> to <value>. Variables available: json, name, testnet. Configuration is persisted in \`${configFilePath}\`.

	Examples:
	- set json true
	- set name my_custom_lisky
`;

const WRITE_FAIL_WARNING =
	'Config file could not be written: your changes will not be persisted.';

const writeConfigToFile = newConfig => {
	try {
		writeJsonSync(configFilePath, newConfig);
		return true;
	} catch (e) {
		return false;
	}
};

const checkBoolean = value => ['true', 'false'].includes(value);

const setNestedConfigProperty = newValue => (obj, pathComponent, i, path) => {
	if (i === path.length - 1) {
		// eslint-disable-next-line no-param-reassign
		obj[pathComponent] = newValue;
		return config;
	}
	return obj[pathComponent];
};

const attemptWriteToFile = (variable, value) => {
	const writeSuccess = writeConfigToFile(config);

	if (!writeSuccess && process.env.NON_INTERACTIVE_MODE === 'true') {
		throw new Error(WRITE_FAIL_WARNING);
	}

	const result = {
		message: `Successfully set ${variable} to ${value}.`,
	};

	if (!writeSuccess) {
		result.warning = WRITE_FAIL_WARNING;
	}

	return result;
};

const setBoolean = (variable, path) => value => {
	if (!checkBoolean(value)) {
		throw new Error('Value must be a boolean.');
	}

	const newValue = value === 'true';
	path.reduce(setNestedConfigProperty(newValue), config);

	if (variable === 'testnet') {
		liskAPIInstance.setTestnet(newValue);
	}

	return attemptWriteToFile(variable, value);
};

const setString = (variable, path) => value => {
	path.reduce(setNestedConfigProperty(value), config);
	return attemptWriteToFile(variable, value);
};

const handlers = {
	json: setBoolean('json', ['json']),
	name: setString('name', ['name']),
	pretty: setBoolean('pretty', ['pretty']),
	testnet: setBoolean('testnet', ['liskJS', 'testnet']),
};

export const actionCreator = () => async ({ variable, value }) => {
	if (!CONFIG_VARIABLES.includes(variable)) {
		throw new Error('Unsupported variable name.');
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
