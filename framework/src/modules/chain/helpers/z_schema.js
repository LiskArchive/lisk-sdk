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

const z_schema = require('z-schema');
const { formats } = require('../../../controller/helpers/validator');

// Register the formats
Object.keys(formats).forEach(formatName => {
	z_schema.registerFormat(formatName, formats[formatName]);
});

// Assigned as custom attribute to be used later
// since z_schema.getRegisteredFormats() only returns keys not the methods
z_schema.formatsCache = formats;

// Exports
module.exports = z_schema;
