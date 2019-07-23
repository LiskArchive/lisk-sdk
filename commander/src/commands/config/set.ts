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
import { hexToBuffer } from '@liskhq/lisk-cryptography';
import url from 'url';
import BaseCommand from '../../base';
import { ConfigOptions, setConfig, WritableValue } from '../../utils/config';
import {
	API_PROTOCOLS,
	CONFIG_VARIABLES,
	NETHASHES,
} from '../../utils/constants';
import { FileSystemError, ValidationError } from '../../utils/error';

interface Args {
	readonly values?: string;
	readonly variable: string;
}

interface WriteResult {
	readonly message: string;
}

const availableVariables = CONFIG_VARIABLES.join(', ');

const WRITE_FAIL_WARNING =
	'Config file could not be written: your changes will not be persisted.';

const NETHASH_ERROR_MESSAGE =
	'Value must be a hex string with 64 characters, or one of main or test.';

const URL_ERROR_MESSAGE = `Node URLs must include a supported protocol (${API_PROTOCOLS.map(
	protocol => protocol.replace(':', ''),
).join(
	', ',
)}) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost.`;

const checkBoolean = (value: string) => ['true', 'false'].includes(value);

const setNestedConfigProperty = (
	config: ConfigOptions,
	path: string,
	value: WritableValue,
): void => {
	const dotNotationArray = path.split('.');
	dotNotationArray.reduce<ConfigOptions>((obj, pathComponent, i) => {
		if (i === dotNotationArray.length - 1) {
			if (obj === undefined) {
				throw new ValidationError(
					`Config file could not be written: property '${dotNotationArray.join(
						'.',
					)}' was not found. It looks like your configuration file is corrupted. Please check the file at ${
						process.env.XDG_CONFIG_HOME
					} or remove it (a fresh default configuration file will be created when you run Lisk Commander again).`,
				);
			}
			obj[pathComponent] = value;

			return config;
		}

		return obj[pathComponent] as ConfigOptions;
	}, config);
};

const attemptWriteToFile = (
	newConfig: ConfigOptions,
	value: WritableValue,
	dotNotation: string,
): WriteResult => {
	const writeSuccess = setConfig(
		process.env.XDG_CONFIG_HOME as string,
		newConfig,
	);

	if (!writeSuccess) {
		throw new FileSystemError(WRITE_FAIL_WARNING);
	}

	const message =
		value === '' || (Array.isArray(value) && value.length === 0)
			? `Successfully reset ${dotNotation}.`
			: `Successfully set ${dotNotation} to ${value}.`;

	const result = {
		message,
	};

	return result;
};

const setValue = (
	config: ConfigOptions,
	dotNotation: string,
	value: WritableValue,
) => {
	setNestedConfigProperty(config, dotNotation, value);

	return attemptWriteToFile(config, value, dotNotation);
};

const setBoolean = (
	config: ConfigOptions,
	dotNotation: string,
	value: string,
) => {
	if (!checkBoolean(value)) {
		throw new ValidationError('Value must be a boolean.');
	}
	const newValue = value === 'true';

	return setValue(config, dotNotation, newValue);
};

const setArrayURL = (
	config: ConfigOptions,
	dotNotation: string,
	_: string,
	inputs: ReadonlyArray<string>,
) => {
	inputs.forEach(input => {
		const { protocol, hostname } = url.parse(input);
		if (
			protocol === undefined ||
			!API_PROTOCOLS.includes(protocol) ||
			!hostname
		) {
			throw new ValidationError(URL_ERROR_MESSAGE);
		}
	});

	return setValue(config, dotNotation, inputs);
};

const setNethash = (
	config: ConfigOptions,
	dotNotation: string,
	value: string,
) => {
	if (
		dotNotation === 'api.network' &&
		!Object.keys(NETHASHES).includes(value)
	) {
		const NETHASH_LENGTH = 64;
		if (value.length !== NETHASH_LENGTH) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
		try {
			hexToBuffer(value, 'utf8');
		} catch (error) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
	}

	return setValue(config, dotNotation, value);
};

interface KeywordHandler {
	readonly [key: string]: (
		config: ConfigOptions,
		dotNotation: string,
		value: string,
		inputs: ReadonlyArray<string>,
	) => WriteResult;
}

const handlers: KeywordHandler = {
	'api.nodes': setArrayURL,
	'api.network': setNethash,
	json: setBoolean,
	name: setValue,
	pretty: setBoolean,
};

export default class SetCommand extends BaseCommand {
	static args = [
		{
			name: 'variable',
			required: true,
			// tslint:disable-next-line array-type
			options: CONFIG_VARIABLES as Array<string>,
			description: '',
		},
		{
			name: 'values',
			required: false,
			description: '',
		},
	];

	static description = `
		Sets configuration.
		...
		Variables available: ${availableVariables}.
	`;

	static examples = [
		'config:set json true',
		'config:set api.network main',
		'config:set api.nodes https://127.0.0.1:4000,http://mynode.com:7000',
	];

	async run(): Promise<void> {
		const { args } = this.parse(SetCommand);
		const { variable, values: valuesStr = '' }: Args = args;
		const values = valuesStr.split(',').filter(Boolean);
		const safeValues = values || [];
		const safeValue = safeValues[0] || '';
		const result = handlers[variable](
			this.userConfig,
			variable,
			safeValue,
			safeValues,
		);
		this.print(result, true);
	}
}
