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

const blockHeaderSchema = require('./block_header_schema');
const { validator } = require('@liskhq/lisk-validator');

const validateBlockHeader = blockHeader => {
	const errors = validator.validate(blockHeaderSchema, blockHeader);
	if (errors.length) {
		throw new Error(errors[0].message);
	}
	return true;
};

module.exports = {
	validateBlockHeader,
};
