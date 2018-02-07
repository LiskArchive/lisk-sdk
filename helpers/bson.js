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
 *
 * @module
 * @see Parent: {@link helpers}
 * @requires bson
 */
var bs = {};

/**
 * Serializes input data.
 *
 * @func serialize
 * @param {Object} data
 * @returns {Buffer}
 * @todo Add descriptions of the parameters and return-value
 */
bs.serialize = function(data) {
	return bson.serialize(data);
};

/**
 * Deserializes input data.
 *
 * @func deserialize
 * @param {Buffer} data
 * @returns {Object}
 * @todo Add descriptions of the parameters and return-value
 */
bs.deserialize = function(data) {
	return bson.deserialize(data);
};

module.exports = bs;
