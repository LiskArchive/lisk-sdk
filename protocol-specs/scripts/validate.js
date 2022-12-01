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

const { join: pathJoin } = require('path');
const { validator } = require('@liskhq/lisk-validator');
const schema = require('../schema/lisk_protocol_specs.schema.json');
const { getFilesFromDir } = require('../utils');

const generatorsOutputPath = pathJoin(__dirname, '../generator_outputs');
const generatorsOutputFiles = getFilesFromDir(generatorsOutputPath, ['.json']);

// eslint-disable-next-line no-restricted-syntax
for (const outputFile of generatorsOutputFiles) {
	const path = pathJoin(generatorsOutputPath, outputFile);

	// eslint-disable-next-line import/no-dynamic-require, global-require
	const spec = require(path);

	console.info(`Validating generator output '${outputFile}'`);
	const errors = validator.validate(schema, spec);
	if (errors.length) {
		console.error('Validation failed...', errors);
	}
}
