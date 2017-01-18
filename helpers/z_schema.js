'use strict';

var ip = require('ip');
var z_schema = require('z-schema');

z_schema.registerFormat('id', function (str) {
	if (str.length === 0) {
		return true;
	}

	return /^[0-9]+$/g.test(str);
});

z_schema.registerFormat('address', function (str) {
	if (str.length === 0) {
		return true;
	}

	return /^[0-9]+[L]$/ig.test(str);
});

z_schema.registerFormat('username', function (str) {
	if (str.length === 0) {
		return true;
	}

	return /^[a-z0-9!@$&_.]+$/ig.test(str);
});

z_schema.registerFormat('hex', function (str) {
	try {
		new Buffer(str, 'hex');
	} catch (e) {
		return false;
	}

	return true;
});

z_schema.registerFormat('publicKey', function (str) {
	if (str.length === 0) {
		return true;
	}

	try {
		var publicKey = new Buffer(str, 'hex');

		return publicKey.length === 32;
	} catch (e) {
		return false;
	}
});

z_schema.registerFormat('csv', function (str) {
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
});

z_schema.registerFormat('signature', function (str) {
	if (str.length === 0) {
		return true;
	}

	try {
		var signature = new Buffer(str, 'hex');
		return signature.length === 64;
	} catch (e) {
		return false;
	}
});

z_schema.registerFormat('queryList', function (obj) {
	obj.limit = 100;
	return true;
});

z_schema.registerFormat('delegatesList', function (obj) {
	obj.limit = 101;
	return true;
});

z_schema.registerFormat('parsedInt', function (value) {
	/*eslint-disable eqeqeq */
	if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, 10))) {
		return false;
	}
    /*eslint-enable eqeqeq */
	value = parseInt(value);
	return true;
});

z_schema.registerFormat('ip', function (str) {
	return ip.isV4Format(str);
});

z_schema.registerFormat('os', function (str) {
	if (str.length === 0) {
		return true;
	}

	return /^[a-z0-9-_.+]+$/ig.test(str);
});

z_schema.registerFormat('version', function (str) {
	if (str.length === 0) {
		return true;
	}

	return /^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})([a-z]{1})?$/g.test(str);
});

// var registeredFormats = z_schema.getRegisteredFormats();
// console.log(registeredFormats);

// Exports
module.exports = z_schema;
