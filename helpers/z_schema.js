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
/**
 * Uses JSON Schema validator z_schema to register custom formats. <br/>
 * Since an IP is not considered to be a hostname while used with SSL. So have to apply additional validation for IP and FQDN with **ipOrFQDN**.
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
 * @see {@link https://github.com/zaggino/z-schema}
 * @memberof module:helpers
 * @requires ip
 * @constructor
 * @return {boolean} True if the format is valid
 */
var _ = require('lodash');
var z_schema = require('z-schema');
var FormatValidators = require('z-schema/src/FormatValidators');
var constants = require('./constants');

var liskFormats = {
	id: function(str) {
		return str === '' || /^[0-9]+$/g.test(str);
	},

	additionalData: function(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return Buffer.from(str).length <= constants.additionalData.maxLength;
	},

	address: function(str) {
		return str === '' || /^[0-9]+L$/gi.test(str);
	},

	username: function(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9!@$&_.]*$/gi.test(str);
	},

	hex: function(str) {
		return str === '' || /^[a-f0-9]+$/i.test(str);
	},

	publicKey: function(str) {
		return str === '' || /^[a-f0-9]{64}$/i.test(str);
	},

	// Currently this allow empty values e.g. ',,,' or '' - is this correct?
	csv: function(str) {
		if (typeof str !== 'string') {
			return false;
		}

		var a = str.split(',');

		if (a.length > 0 && a.length <= 1000) {
			return true;
		} else {
			return false;
		}
	},

	signature: function(str) {
		return str === '' || /^[a-f0-9]{128}$/i.test(str);
	},

	queryList: function(obj) {
		if (obj == null || typeof obj !== 'object' || _.isArray(obj)) {
			return false;
		}

		obj.limit = 100;
		return true;
	},

	delegatesList: function(obj) {
		if (obj == null || typeof obj !== 'object' || _.isArray(obj)) {
			return false;
		}

		obj.limit = 101;
		return true;
	},

	parsedInt: function(value) {
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

	ip: function(str) {
		return ip.isV4Format(str);
	},

	os: function(str) {
		if (typeof str !== 'string') {
			return false;
		}

		return /^[a-z0-9-_.+]*$/gi.test(str);
	},

	version: function(str) {
		return (
			str === '' ||
			/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})([a-z]{1})?$/g.test(str)
		);
	},

	ipOrFQDN: function(str) {
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
