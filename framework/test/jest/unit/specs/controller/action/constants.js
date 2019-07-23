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

const MODULE_NAME = 'module';
const ACTION_NAME = 'action';

module.exports = Object.freeze({
	ACTION_NAME,
	MODULE_NAME,
	INVALID_ACTION_NAME_ARG: '09',
	INVALID_ACTION_SOURCE_ARG: '123',
	VALID_ACTION_NAME_ARG: `${MODULE_NAME}:${ACTION_NAME}`,
	VALID_ACTION_SOURCE_ARG: 'source',
	PARAMS: '#params',
});
