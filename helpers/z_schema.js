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
var constants = require('./constants');

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
 * @requires helpers/constants
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
		if (typeof str !== 'string') {
			return false;
		}

		return Buffer.from(str).length <= constants.additionalData.maxLength;
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
	encryptedSecret(str) {
		// Explanation of regex structure:
		// - $pbkdf2-sha256 => hash algorithm
		// - $rounds=n (optional) => number of rounds to be used in key derivation function
		// - $HEX_SALT => salt used in key derivation function
		// - $HEX_CIPHERTEXT => encrypted secret
		// - Optional additional parameters (order and number is unimportant):
		//   - $iv=HEX_IV => IV used for encryption
		//   - $tag=HEX_TAG => tag used to authenticate when decrypting
		//   - $version=SEMVER_VERSION => version check for future proofing
		// Examples:
		// - $pbkdf2-sha256$rounds=1$e33b33c7621fc33d361ff26d1b9611b4$aedfce0b845f7c962ea57a76f7bb7e48228273356fdab39ce71c9c385e105f7660101a7ffbee14ef5aa9dc8d03d6715e0828acae8d8625bbec9a167839d0f935445d14a874e18cbed8b01f7da74d990e$iv=51b98dbc815996de7821e56fcc985fbb$tag=75a9571b9018e59255f5ed8ac8f7db75$version=1.0.0
		// - $pbkdf2-sha256$e33b33c7621fc33d361ff26d1b9611b4$aedfce0b845f7c962ea57a76f7bb7e48228273356fdab39ce71c9c385e105f7660101a7ffbee14ef5aa9dc8d03d6715e0828acae8d8625bbec9a167839d0f935445d14a874e18cbed8b01f7da74d990e
		// NOTE: Maximum lengths chosen here are arbitrary
		return /^\$pbkdf2-sha256(\$rounds=\d{1,32})?\$[a-f0-9]{32}\$[a-f0-9]{2,1024}(\$((iv|tag)=[a-f0-9]{32}|version=\d{1,4}\.\d{1,4}\.\d{1,4})){0,3}$/i.test(
			str
		);
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
			/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3})?$/.test(
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
