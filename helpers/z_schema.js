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
var z_schema = require('z-schema');
var FormatValidators = require('z-schema/src/FormatValidators');
var constants = require('./constants');

var liskFormats = {
	id: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[0-9]+$/g.test(str);
	}, 

	additionalData: function (str) {
		return Buffer.from(str).length <= constants.additionalData.maxLength;
	},

	address: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[0-9]+[L]$/ig.test(str);
	},

	username: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[a-z0-9!@$&_.]+$/ig.test(str);
	},

	hex: function (str) {
		return /^[a-f0-9]*$/i.test(str);
	},

	publicKey: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[a-f0-9]{64}$/i.test(str);
	},

	csv: function (str) {
		try {
			var a = str.split(',');
			if (a.length > 0 && a.length <= 1000) {
				return true;
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
	},

	signature: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[a-f0-9]{128}$/i.test(str);
	},

	queryList: function (obj) {
		obj.limit = 100;
		return true;
	},

	delegatesList: function (obj) {
		obj.limit = 101;
		return true;
	},

	parsedInt: function (value) {
		/*eslint-disable eqeqeq */
		if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, 10))) {
			return false;
		}
		/*eslint-enable eqeqeq */
		value = parseInt(value);
		return true;
	},

	ip: function (str) {
		return ip.isV4Format(str);
	},

	os: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^[a-z0-9-_.+]+$/ig.test(str);
	},

	version: function (str) {
		if (str.length === 0) {
			return true;
		}
	
		return /^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})([a-z]{1})?$/g.test(str);
	},

	ipOrFQDN: function (str) {
		return ip.isV4Format(str) || FormatValidators.hostname(str);
	},
};

// Register the formats 
Object.keys(liskFormats).forEach(function (formatName) {
	z_schema.registerFormat(formatName, liskFormats[formatName]);
});


// Assigned as custom attribute to be used later 
// since z_schema.getRegisteredFormats() only resturns keys not the methods
z_schema.formatsCache = liskFormats;	

// Exports
module.exports = z_schema;
