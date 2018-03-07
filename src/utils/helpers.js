/*
 * LiskHQ/lisk-commander
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
import { ValidationError } from '../utils/error';
import commonOptions from '../utils/options';
import print from '../utils/print';

export const validatePublicKeys = publicKeys =>
	publicKeys.map(publicKey => {
		try {
			Buffer.from(publicKey, 'hex');
		} catch (error) {
			throw new ValidationError(
				`Error processing public key ${publicKey}: ${error.message}.`,
			);
		}
		if (publicKey.length !== 64) {
			throw new ValidationError(
				`Public key ${publicKey} length differs from the expected 64 hex characters for a public key.`,
			);
		}

		if (Buffer.from(publicKey, 'hex').length !== 32) {
			throw new ValidationError(
				`Public key ${publicKey} bytes length differs from the expected 32 bytes for a public key.`,
			);
		}
		return publicKey;
	});

const regExpAddress = /^\d{1,21}[L|l]$/;
const regExpAmount = /^\d+(\.\d{1,8})?$/;
const DECIMAL_PLACES = 8;

const isStringInteger = n => {
	const parsed = parseInt(n, 10);
	return !Number.isNaN(parsed) && parsed.toString() === n;
};

export const validateLifetime = lifetime => {
	if (!isStringInteger(lifetime)) {
		throw new ValidationError('Lifetime must be an integer.');
	}
	return true;
};

export const validateMinimum = minimum => {
	if (!isStringInteger(minimum)) {
		throw new ValidationError(
			'Minimum number of signatures must be an integer.',
		);
	}
	return true;
};

export const validateAddress = address => {
	if (!address.match(regExpAddress)) {
		throw new ValidationError(`${address} is not a valid address.`);
	}
	return true;
};

export const validateAmount = amount => {
	if (!amount.match(regExpAmount)) {
		throw new ValidationError(
			'Amount must be a number with no more than 8 decimal places.',
		);
	}
	return true;
};

export const normalizeAmount = amount => {
	validateAmount(amount);
	const [preString, postString = ''] = amount.split('.');
	const [preArray, postArray] = [preString, postString].map(n => Array.from(n));
	const pad = new Array(DECIMAL_PLACES - postArray.length).fill('0');
	const combinedArray = [...preArray, ...postArray, ...pad];
	const combinedString = combinedArray.join('');
	const trimmed = combinedString.replace(/^0+/, '') || '0';
	return trimmed;
};

export const deAlias = type => (type === 'addresses' ? 'accounts' : type);

export const shouldUseJSONOutput = (config = {}, options = {}) => {
	if (!!options.json === options.json) return options.json;
	if (!!options.table === options.table) return !options.table;
	return !!config.json;
};

export const shouldUsePrettyOutput = (config, options) =>
	(options.pretty === true || config.pretty === true) &&
	options.pretty !== false;

export const createErrorHandler = prefix => ({ message }) => ({
	error: `${prefix}: ${message}`,
});

const validateOutputFormatOptions = options => {
	if (options.json && options.table) {
		throw new ValidationError('Cannot output both JSON and table.');
	}
	if (options.json === false && options.table === false) {
		throw new ValidationError('Must output either JSON or table.');
	}
	return true;
};

export const prepareOptions = async options =>
	new Promise((resolve, reject) => {
		try {
			validateOutputFormatOptions(options);
			resolve(options);
		} catch (error) {
			// eslint-disable-next-line no-param-reassign
			delete options.json;
			// eslint-disable-next-line no-param-reassign
			delete options.table;
			reject(error);
		}
	});

export const wrapActionCreator = (vorpal, actionCreator, errorPrefix) =>
	async function wrappedActionCreator(parameters) {
		return prepareOptions(parameters.options)
			.then(() => actionCreator(vorpal).call(this, parameters))
			.catch(createErrorHandler(errorPrefix))
			.then(print(vorpal, parameters.options).bind(this));
	};

const OPTION_TYPES = {
	string: [
		'message',
		'passphrase',
		'password',
		'second-passphrase',
		'unvotes',
		'votes',
	],
};

export const createCommand = ({
	command,
	autocomplete,
	description,
	alias,
	actionCreator,
	options = [],
	errorPrefix,
}) =>
	function createdCommand(vorpal) {
		const action = wrapActionCreator(vorpal, actionCreator, errorPrefix);
		const commandInstance = vorpal
			.command(command)
			.autocomplete(autocomplete)
			.description(description)
			.types(OPTION_TYPES)
			.action(action);

		if (alias) commandInstance.alias(alias);

		[
			commonOptions.json,
			commonOptions.pretty,
			commonOptions.table,
			...options,
		].forEach(option => commandInstance.option(...option));
	};
