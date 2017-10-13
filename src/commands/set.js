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
import os from 'os';
import { CONFIG_VARIABLES } from '../utils/constants';
import config from '../utils/env';
import { writeJsonSync } from '../utils/fs';
import { createCommand } from '../utils/helpers';
import liskInstance from '../utils/liskInstance';

const configFilePath = `${os.homedir()}/.lisky/config.json`;

const description = `Set configuration <variable> to <value>. Variables available: json, testnet. Configuration is persisted in \`${configFilePath}\`.

	Example: set json true
`;

const writeConfigToFile = (vorpal, newConfig) => {
	try {
		writeJsonSync(configFilePath, newConfig);
		return true;
	} catch (e) {
		vorpal.activeCommand.log(`WARNING: Could not write to \`${configFilePath}\`. Your configuration will not be persisted.`);
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

const attemptWriteToFile = (vorpal, variable, value) => {
	const writeSuccess = writeConfigToFile(vorpal, config);

	if (!writeSuccess && process.env.NON_INTERACTIVE_MODE === 'true') {
		return `Could not set ${variable} to ${value}.`;
	}
	return `Successfully set ${variable} to ${value}.`;
};

const setBoolean = (variable, path) => (vorpal, value) => {
	if (!checkBoolean(value)) {
		return `Cannot set ${variable} to ${value}.`;
	}

	const newValue = (value === 'true');
	path.reduce(setNestedConfigProperty(newValue), config);

	if (variable === 'testnet') {
		liskInstance.setTestnet(newValue);
	}

	return attemptWriteToFile(vorpal, variable, value);
};

const setString = (variable, path) => (vorpal, value) => {
	path.reduce(setNestedConfigProperty(value), config);
	return attemptWriteToFile(vorpal, variable, value);
};

const handlers = {
	json: setBoolean('json output', ['json']),
	name: setString('name', ['name']),
	testnet: setBoolean('testnet', ['liskJS', 'testnet']),
};

const actionCreator = vorpal => async ({ variable, value }) => {
	if (!CONFIG_VARIABLES.includes(variable)) {
		throw new Error('Unsupported variable name.');
	}

	return {
		message: handlers[variable](vorpal, value),
	};
};

const set = createCommand({
	command: 'set <variable> <value>',
	autocomplete: CONFIG_VARIABLES,
	description,
	actionCreator,
	errorPrefix: 'Could not set variable',
});

export default set;
