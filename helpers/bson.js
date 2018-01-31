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
bs.serialize = function(data) {
	return bson.serialize(data);
};

/**
 * Deserializes input data.
 * @implements {bson}
 * @param {Buffer} data
 * @return {Object}
 */
bs.deserialize = function(data) {
	return bson.deserialize(data);
};

module.exports = bs;
