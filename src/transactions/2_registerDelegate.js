/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
/**
 * Delegate module provides functions to create delegate registration transactions.
 * @class delegate
 */
import { DELEGATE_FEE } from '../constants';
import { wrapTransactionCreator } from './utils';

/**
 * @method registerDelegate
 * @param {Object} Object - Object
 * @param {String} Object.username
 *
 * @return {Object}
 */

const registerDelegate = ({ username }) => ({
	type: 2,
	fee: DELEGATE_FEE.toString(),
	asset: {
		delegate: {
			username,
		},
	},
});

export default wrapTransactionCreator(registerDelegate);
