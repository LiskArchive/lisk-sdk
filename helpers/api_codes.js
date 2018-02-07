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

/**
 * Description of the namespace.
 *
 * @namespace api_codes
 * @memberof helpers
 * @see Parent: {@link helpers}
 * @property {number} OK - Description of the value
 * @property {number} EMPTY_RESOURCES_OK - Description of the value
 * @property {number} NO_CONTENT - Description of the value
 * @property {number} INTERNAL_SERVER_ERROR - Description of the value
 * @property {number} BAD_REQUEST - Description of the value
 * @property {number} FORBIDDEN - Description of the value
 * @property {number} NOT_FOUND - Description of the value
 * @property {number} PROCESSING_ERROR - Description of the value
 * @property {number} TOO_MANY_REQUESTS - Description of the value
 * @todo Add description of the namespace and its values
 */
module.exports = {
	OK: 200,
	EMPTY_RESOURCES_OK: 200,
	NO_CONTENT: 204,
	INTERNAL_SERVER_ERROR: 500,
	BAD_REQUEST: 400,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	PROCESSING_ERROR: 409,
	TOO_MANY_REQUESTS: 429,
};
