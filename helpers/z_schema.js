/*
 * Copyright © 2018 Lisk Foundation
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

var ip = require('ip');
var _ = require('lodash');
var z_schema = require('z-schema');
var FormatValidators = require('z-schema/src/FormatValidators');
var Bignum = require('./bignum.js');

/**
 * Uses JSON Schema validator z_schema to register custom formats.
 * Since an IP is not considered to be a hostname while used with SSL.
 * So have to apply additional validation for IP and FQDN with **ipOrFQDN**.
 * - id
 * - address
 * - username
 * - hex
 * - publicKey
 * - csv
 * - signature
 * - queryList
 * - delegatesList
 * - parsedInt
 * - ip
 * - ipOrFQDN
 * - os
 * - version
 *
 * @module
 * @see {@link https://github.com/zaggino/z-schema}
 * @requires ip
 * @requires lodash
 * @requires z-schema
 * @returns {boolean} True if the format is valid
 * @see Parent: {@link helpers}
 */

/**
 * @exports helpers/z_schema
 */
var liskFormats = {
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	id(str) {
		return str === '' || /^[0-9]+$/g.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	additionalData(str) {
		/**
		 * This deconstruction has to take place here because
		 * global.constants will be defined in test/setup.js.
		 */
		const { ADDITIONAL_DATA } = global.constants;
		if (typeof str !== 'string') {
			return false;
		}
		return Buffer.from(str).length <= ADDITIONAL_DATA.MAX_LENGTH;
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	address(str) {
		return str === '' || /^[0-9]+L$/g.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	username(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9!@$&_.]*$/gi.test(str);
	},

	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	hex(str) {
		return str === '' || /^[a-f0-9]+$/i.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	publicKey(str) {
		return str === '' || /^[a-f0-9]{64}$/i.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	// Currently this allow empty values e.g. ',,,' or '' - is this correct?
	csv(str) {
		if (typeof str !== 'string') {
			return false;
		}

		var a = str.split(',');

		if (a.length > 0 && a.length <= 1000) {
			return true;
		}
		return false;
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	signature(str) {
		return str === '' || /^[a-f0-9]{128}$/i.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
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
			`${keyRegExp.source}=${valueRegExp.source}`
		);
		const encryptedPassphraseRegExp = new RegExp(
			`^(${keyValueRegExp.source})(?:&(${keyValueRegExp.source})){0,10}$`
		);
		return encryptedPassphraseRegExp.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {Object} obj
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	queryList(obj) {
		if (obj == null || typeof obj !== 'object' || _.isArray(obj)) {
			return false;
		}

		obj.limit = 100;
		return true;
	},
	/**
	 * Description of the function.
	 *
	 * @param {Object} obj
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	delegatesList(obj) {
		if (obj == null || typeof obj !== 'object' || _.isArray(obj)) {
			return false;
		}

		obj.limit = 101;
		return true;
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} value
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	parsedInt(value) {
		if (
			isNaN(value) ||
			parseInt(value) != value ||
			isNaN(parseInt(value, 10))
		) {
			return false;
		}
		value = parseInt(value);
		return true;
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	ip(str) {
		return ip.isV4Format(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	os(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9-_.+]*$/gi.test(str);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	version(str) {
		return (
			str === '' ||
			/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3}(\.[0-9]{1,3})?)?$/.test(
				str
			)
		);
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} str
	 * @returns {boolean}
	 * @todo Add description for the function, the params and the return value
	 */
	ipOrFQDN(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return ip.isV4Format(str) || FormatValidators.hostname(str);
	},
	/**
	 * Transaction amount/fee.
	 *
	 * @param {Object} value
	 * @returns {boolean}
	 */
	amount(value) {
		/**
		 * This deconstruction has to take place here because
		 * global.constants will be defined in test/setup.js.
		 */
		const { TOTAL_AMOUNT } = global.constants;
		if (value instanceof Bignum) {
			return (
				value.isGreaterThanOrEqualTo(0) &&
				value.isLessThanOrEqualTo(TOTAL_AMOUNT)
			);
		}
		return false;
	},
	/**
	 * Returns true for integer or null.
	 *
	 * @param {Object} value
	 * @returns {boolean}
	 */
	integerOrNull(value) {
		return Number.isInteger(value) || value === null;
	},
};

// Register the formats
Object.keys(liskFormats).forEach(formatName => {
	z_schema.registerFormat(formatName, liskFormats[formatName]);
});

// Assigned as custom attribute to be used later
// since z_schema.getRegisteredFormats() only resturns keys not the methods
z_schema.formatsCache = liskFormats;

// Exports
module.exports = z_schema;
