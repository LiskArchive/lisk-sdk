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

var lisk = require('lisk-js').default;

module.exports = {
	generateValidTransaction() {
		var gAccountPassphrase =
			'wagon stock borrow episode laundry kitten salute link globe zero feed marble';
		var randomAddress = lisk.cryptography.getAddress(
			lisk.cryptography.getKeys(
				Math.random()
					.toString(36)
					.substring(7)
			).publicKey
		);

		return lisk.transaction.transfer({
			amount: 1,
			passphrase: gAccountPassphrase,
			recipientId: randomAddress,
		});
	},
};
