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

var util = require('util');
var Field = require('../validator').prototype.Field;

module.exports = JsonSchemaField;

function JsonSchemaField(validator, path, value, rule, thisArg) {
	Field.call(this, validator, path, value, rule, thisArg);
}

util.inherits(JsonSchemaField, Field);
