/*
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
 */

'use strict';

const ip = require('ip');
const _ = require('lodash');

const HOSTNAME = /^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/;

const UINT64_MAX = BigInt('18446744073709551615');

const ADDITIONAL_DATA = {
	MIN_LENGTH: 1,
	MAX_LENGTH: 64,
};

/**
 *
 * Uses JSON Schema validator z_schema to register custom formats.
 * Since an IP is not considered to be a hostname while used with SSL.
 * So have to apply additional validation for IP and FQDN with **ipOrFQDN**.
 * - id
 * - address
 * - amount
 * - BigInt
 * - username
 * - hex
 * - publicKey
 * - csv
 * - signature
 * - queryList
 * - delegatesList
 * - parsedInt
 * - path
 * - ip
 * - ipOrFQDN
 * - os
 * - version
 *
 */

const validationFormats = {
	id(str) {
		return str === '' || /^[0-9]+$/g.test(str);
	},

	additionalData(str) {
		/**
		 * This deconstruction has to take place here because
		 * global.constants will be defined in test/setup.js.
		 */
		if (typeof str !== 'string') {
			return false;
		}
		return Buffer.from(str).length <= ADDITIONAL_DATA.MAX_LENGTH;
	},

	address(str) {
		if (str === '') {
			return true;
		}

		// Address can not have leading zeros
		if (/^0[0-9]+L$/g.test(str)) {
			return false;
		}

		// Address can not have non decimal numbers
		if (!/^[0-9]+L$/g.test(str)) {
			return false;
		}

		// Address can not exceed the max limit
		if (BigInt(str.slice(0, -1)) > BigInt(UINT64_MAX)) {
			return false;
		}

		return true;
	},

	username(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9!@$&_.]*$/gi.test(str);
	},

	hex(str) {
		return str === '' || /^[a-f0-9]+$/i.test(str);
	},

	publicKey(str) {
		return str === '' || /^[a-f0-9]{64}$/i.test(str);
	},

	// Currently this allow empty values e.g. ',,,' or '' - is this correct?
	csv(str) {
		if (typeof str !== 'string') {
			return false;
		}

		const a = str.split(',');

		if (a.length > 0 && a.length <= 1000) {
			return true;
		}
		return false;
	},

	signature(str) {
		return str === '' || /^[a-f0-9]{128}$/i.test(str);
	},

	encryptedPassphrase(str) {
		// Explanation of regex structure:
		// - 1 or more 'key=value' pairs delimited with '&'
		// Examples:
		// - cipherText=abcd1234
		// - cipherText=abcd1234&iterations=10000&iv=ef012345
		// NOTE: Maximum lengths chosen here are arbitrary
		const keyRegExp = /[a-zA-Z0-9]{2,15}/;
		const valueRegExp = /[a-f0-9]{1,256}/;
		const keyValueRegExp = new RegExp(
			`${keyRegExp.source}=${valueRegExp.source}`,
		);
		const encryptedPassphraseRegExp = new RegExp(
			`^(${keyValueRegExp.source})(?:&(${keyValueRegExp.source})){0,10}$`,
		);
		return encryptedPassphraseRegExp.test(str);
	},

	queryList(obj) {
		if (!_.isObject(obj) || Array.isArray(obj)) {
			return false;
		}

		obj.limit = 100;
		return true;
	},

	delegatesList(obj) {
		if (!_.isObject(obj) || Array.isArray(obj)) {
			return false;
		}

		obj.limit = 101;
		return true;
	},

	parsedInt(value) {
		if (
			Number.isNaN(value) ||
			parseInt(value, 10).toString() !== String(value) ||
			Number.isNaN(parseInt(value, 10))
		) {
			return false;
		}
		return true;
	},

	path(str) {
		const pathRegExp = new RegExp('^(/[^/]+)+$');
		return pathRegExp.test(str);
	},

	ip(str) {
		return ip.isV4Format(str);
	},

	os(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9-_.+]*$/gi.test(str);
	},

	version(str) {
		return (
			str === '' ||
			/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3}(\.[0-9]{1,3})?)?$/.test(
				str,
			)
		);
	},

	protocolVersion(str) {
		return str === '' || /^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(str);
	},

	ipOrFQDN(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return ip.isV4Format(str) || HOSTNAME.test(str);
	},

	amount(value) {
		if (typeof value === 'string' && /^[0-9]*$/.test(value)) {
			const bigintValue = BigInt(value);
			return bigintValue >= BigInt(0) && bigintValue <= BigInt(UINT64_MAX);
		}

		/**
		 * This deconstruction has to take place here because
		 * global.constants will be defined in test/setup.js.
		 */
		if (typeof value === 'bigint') {
			const { TOTAL_AMOUNT } = global.constants;

			return value >= BigInt(0) && value <= BigInt(TOTAL_AMOUNT);
		}

		return false;
	},

	integerOrNull(value) {
		return Number.isInteger(value) || value === null;
	},

	oddInteger: {
		type: 'number',
		validate: value => Number.isInteger(value) && /^\d*[13579]$/.test(value),
	},

	numAmount: {
		type: 'number',
		validate: value => {
			const { TOTAL_AMOUNT } = global.constants;
			if (BigInt(value) >= 0) {
				return BigInt(value) <= BigInt(TOTAL_AMOUNT);
			}

			return false;
		},
	},
};

module.exports = validationFormats;
