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
import fse from 'fs-extra';
import config from '../utils/env';
import liskInstance from '../utils/liskInstance';
import { CONFIG_VARIABLES } from '../utils/constants';

const configFilePath = `${os.homedir()}/.lisky/config.json`;

const description = `Set configuration <variable> to <value>. Variables available: json, testnet. Configuration is persisted in \`${configFilePath}\`.

	Example: set json true
`;

const writeConfigToFile = (vorpal, newConfig) => {
	try {
		fse.writeJsonSync(configFilePath, newConfig, {
			spaces: '\t',
		});
		return true;
	} catch (e) {
		vorpal.log(`WARNING: Could not write to \`${configFilePath}\`. Your configuration will not be persisted.`);
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

const setBoolean = (variable, path) => (vorpal, value) => {
	if (!checkBoolean(value)) {
		return `Cannot set ${variable} to ${value}.`;
	}

	const newValue = (value === 'true');
	path.reduce(setNestedConfigProperty(newValue), config);

	if (variable === 'testnet') {
		liskInstance.setTestnet(newValue);
	}

	const writeSuccess = writeConfigToFile(vorpal, config);

	if (!writeSuccess && process.env.NON_INTERACTIVE_MODE === 'true') {
		return `Could not set ${variable} to ${value}.`;
	}
	return `Successfully set ${variable} to ${value}.`;
};

const handlers = {
	json: setBoolean('json output', ['json']),
	testnet: setBoolean('testnet', ['liskJS', 'testnet']),
};

const set = vorpal => ({ variable, value }) => {
	const returnValue = CONFIG_VARIABLES.includes(variable)
		? handlers[variable](vorpal, value)
		: 'Unsupported variable name.';

	return Promise.resolve(vorpal.activeCommand.log(returnValue));
};

export default function setCommand(vorpal) {
	vorpal
		.command('set <variable> <value>')
		.description(description)
		.autocomplete(CONFIG_VARIABLES)
		.action(set(vorpal));
}
