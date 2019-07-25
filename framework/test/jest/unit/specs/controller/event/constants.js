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
const EVENT_NAME = 'event';

module.exports = Object.freeze({
	MODULE_NAME,
	EVENT_NAME,
	VALID_EVENT_NAME_ARG: `${MODULE_NAME}:${EVENT_NAME}`,
	INVALID_EVENT_NAME_ARG: `${MODULE_NAME}`,
	DATA: '#data',
});
