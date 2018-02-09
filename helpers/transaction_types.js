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
 * @namespace transaction_types
 * @memberof helpers
 * @see Parent: {@link helpers}
 * @property {number} SEND - Description of the value
 * @property {number} SIGNATURE - Description of the value
 * @property {number} DELEGATE - Description of the value
 * @property {number} VOTE - Description of the value
 * @property {number} MULTI - Description of the value
 * @property {number} IN_TRANSFER - Description of the value
 * @property {number} OUT_TRANSFER - Description of the value
 * @todo Add description of the namespace and its values
 */
module.exports = {
	SEND: 0,
	SIGNATURE: 1,
	DELEGATE: 2,
	VOTE: 3,
	MULTI: 4,
	DAPP: 5,
	IN_TRANSFER: 6,
	OUT_TRANSFER: 7,
};
