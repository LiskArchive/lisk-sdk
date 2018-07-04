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
 * @namespace exceptions
 * @memberof config
 * @see Parent: {@link config}
 * @property {Array} blockRewards
 * @property {Array} delegates
 * @property {Object} rounds
 * @property {string[]} senderPublicKey
 * @property {string[]} signatures
 * @property {string[]} multisignatures
 * @property {string[]} votes
 * @property {Object} precedent - A rule/authoritative checkpoint in place to follow in future
 * @property {string} precedent.disableDappTransfer - Disable Dapp in and out transfer transactions
 * @todo Add description for the namespace and the properties
 */
module.exports = {
	blockRewards: [],
	delegates: [],
	rounds: {},
	senderPublicKey: [],
	signatures: [],
	multisignatures: [],
	votes: [],
	inertTransactions: [],
	transactionFee: [],
	precedent: {
		disableDappTransfer: 0,
	},
};
