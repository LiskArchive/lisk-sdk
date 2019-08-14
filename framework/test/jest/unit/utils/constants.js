/*
 * Copyright © 2019 Lisk Foundation
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

const validator = require('../../../../src/controller/validator');
const {
	constantsSchema,
	applicationConfigSchema,
} = require('../../../../src/controller/schema');
const { deepFreeze } = require('./deep_freeze');

const sharedConstants = validator.parseEnvArgAndValidate(constantsSchema, {});
const appConfig = validator.parseEnvArgAndValidate(applicationConfigSchema, {});

const constants = deepFreeze({
	...sharedConstants,
	...appConfig.app.genesisConfig,
});

module.exports = {
	constants,
};
