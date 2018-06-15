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
import url from 'url';
import elements from 'lisk-elements';
import { CONFIG_VARIABLES, NETHASHES, API_PROTOCOLS } from '../utils/constants';
import { getConfig, setConfig, configFilePath } from '../utils/config';
import { FileSystemError, ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';

const availableVariables = CONFIG_VARIABLES.join(', ');
const description = `Sets configuration <variable> to [value(s)...]. Variables available: ${availableVariables}. Configuration is persisted in \`${configFilePath()}\`.

	Examples:
	- set json true
	- set name my_custom_lisk_cli
	- set api.network main
	- set api.nodes https://127.0.0.1:4000,http://mynode.com:7000
`;

const WRITE_FAIL_WARNING =
	'Config file could not be written: your changes will not be persisted.';

const NETHASH_ERROR_MESSAGE =
	'Value must be a hex string with 64 characters, or one of main, test or beta.';

const URL_ERROR_MESSAGE = `Node URLs must include a supported protocol (${API_PROTOCOLS.map(
	protocol => protocol.replace(':', ''),
).join(
	', ',
)}) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost.`;

const checkBoolean = value => ['true', 'false'].includes(value);

const setNestedConfigProperty = (config, path, value) => {
	const dotNotationArray = path.split('.');
	dotNotationArray.reduce((obj, pathComponent, i) => {
		if (i === dotNotationArray.length - 1) {
			if (obj === undefined) {
				throw new ValidationError(
					`Config file could not be written: property '${dotNotationArray.join(
						'.',
					)}' was not found. It looks like your configuration file is corrupted. Please check the file at ${configFilePath()} or remove it (a fresh default configuration file will be created when you run Lisk Commander again).`,
				);
			}
			// eslint-disable-next-line no-param-reassign
			obj[pathComponent] = value;
			return config;
		}
		return obj[pathComponent];
	}, config);
};

const attemptWriteToFile = (newConfig, value, dotNotation) => {
	const writeSuccess = setConfig(newConfig);

	if (!writeSuccess && process.env.NON_INTERACTIVE_MODE === 'true') {
		throw new FileSystemError(WRITE_FAIL_WARNING);
	}

	const message =
		value === '' || (Array.isArray(value) && value.length === 0)
			? `Successfully reset ${dotNotation}.`
			: `Successfully set ${dotNotation} to ${value}.`;

	const result = {
		message,
	};

	if (!writeSuccess) {
		result.warning = WRITE_FAIL_WARNING;
	}

	return result;
};

const setValue = (dotNotation, value) => {
	const config = getConfig();
	setNestedConfigProperty(config, dotNotation, value);
	return attemptWriteToFile(config, value, dotNotation);
};

const setBoolean = (dotNotation, value) => {
	if (!checkBoolean(value)) {
		throw new ValidationError('Value must be a boolean.');
	}
	const newValue = value === 'true';
	return setValue(dotNotation, newValue);
};

const setArrayURL = (dotNotation, value, inputs) => {
	inputs.forEach(input => {
		const { protocol, hostname } = url.parse(input);
		if (!API_PROTOCOLS.includes(protocol) || !hostname) {
			throw new ValidationError(URL_ERROR_MESSAGE);
		}
	});
	return setValue(dotNotation, inputs);
};

const setNethash = (dotNotation, value) => {
	if (
		dotNotation === 'api.network' &&
		!Object.keys(NETHASHES).includes(value)
	) {
		if (value.length !== 64) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
		try {
			elements.cryptography.hexToBuffer(value, 'utf8');
		} catch (error) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
	}
	return setValue(dotNotation, value);
};

const handlers = {
	'api.nodes': setArrayURL,
	'api.network': setNethash,
	json: setBoolean,
	name: setValue,
	pretty: setBoolean,
};

export const actionCreator = () => async ({ variable, values }) => {
	if (!CONFIG_VARIABLES.includes(variable)) {
		throw new ValidationError('Unsupported variable name.');
	}
	const safeValues = values || [];
	const safeValue = safeValues[0] || '';
	return handlers[variable](variable, safeValue, safeValues);
};

const set = createCommand({
	command: 'set <variable> [values...]',
	autocomplete: CONFIG_VARIABLES,
	description,
	actionCreator,
	errorPrefix: 'Could not set config variable',
});

export default set;
