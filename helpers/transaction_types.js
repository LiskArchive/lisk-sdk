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
 * @property {number} SEND
 * @property {number} SIGNATURE
 * @property {number} DELEGATE
 * @property {number} VOTE
 * @property {number} MULTI
 * @property {number} IN_TRANSFER
 * @property {number} OUT_TRANSFER
 * @todo Add description for the namespace and the properties
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
