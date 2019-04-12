const ip = require('ip');
const _ = require('lodash');
const Bignum = require('bignumber.js');

const HOSTNAME = /^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/;

const UINT64_MAX = new Bignum('18446744073709551615');

/**
 *
 * Uses JSON Schema validator z_schema to register custom formats.
 * Since an IP is not considered to be a hostname while used with SSL.
 * So have to apply additional validation for IP and FQDN with **ipOrFQDN**.
 * - id
 * - address
 * - amount
 * - bignum
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
 */

const validationFormats = {
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
		if (new Bignum(str.slice(0, -1)).isGreaterThan(UINT64_MAX)) {
			return false;
		}

		return true;
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

		const a = str.split(',');

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
		if (!_.isObject(obj) || Array.isArray(obj)) {
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
		if (!_.isObject(obj) || Array.isArray(obj)) {
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
			Number.isNaN(value) ||
			parseInt(value).toString() !== String(value) ||
			Number.isNaN(parseInt(value, 10))
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
	 * Validation for the protocol version format.
	 * @param str
	 * @returns {boolean}
	 */
	protocolVersion(str) {
		return str === '' || /^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(str);
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

		return ip.isV4Format(str) || HOSTNAME.test(str);
	},
	/**
	 * Transaction amount/fee.
	 * Also validate string amount to be lower than TOTAL_AMOUNT constant
	 *
	 * @param {Object} value
	 * @returns {boolean}
	 */
	amount(value) {
		if (typeof value === 'string' && /^[0-9]*$/.test(value)) {
			const bigNumber = new Bignum(value);
			return (
				bigNumber.isGreaterThanOrEqualTo(0) &&
				bigNumber.isLessThanOrEqualTo(UINT64_MAX)
			);
		}

		/**
		 * This deconstruction has to take place here because
		 * global.constants will be defined in test/setup.js.
		 */
		if (value instanceof Bignum) {
			const { TOTAL_AMOUNT } = global.constants;

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
	/**
	 * Returns true if integer is odd.
	 *
	 * @param {Object} value
	 * @returns {boolean}
	 */
	oddInteger: {
		type: 'number',
		validate: value => Number.isInteger(value) && /^\d*[13579]$/.test(value),
	},
	/**
	 * Returns true if value is lower than or equal to `TOTAL_AMOUNT`.
	 *
	 * @param {Object} value
	 * @returns {boolean}
	 */
	numAmount: {
		type: 'number',
		validate: value => {
			const { TOTAL_AMOUNT } = global.constants;
			if (new Bignum(value).isPositive()) {
				return new Bignum(value).isLessThanOrEqualTo(TOTAL_AMOUNT);
			}

			return false;
		},
	},
};

module.exports = validationFormats;
