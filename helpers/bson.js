'use strict';

var BSON = require('bson');

var bson = new BSON();

/**
 * BSON wrapper.
 * @memberof module:helpers
 * @requires bson
 * @namespace
 */
var bs = {};

/**
 * Serializes input data.
 * @implements {bson}
 * @param {Object} data
 * @return {Buffer}
 */
bs.serialize = function (data) {
	return bson.serialize(data);
};

/**
 * Deserializes input data.
 * @implements {bson}
 * @param {Buffer} data
 * @return {Object}
 */
bs.deserialize = function (data) {
	return bson.deserialize(data);
};

module.exports = bs;