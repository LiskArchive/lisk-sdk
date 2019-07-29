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

module.exports = {
	stringToIpPortSet: value => {
		if (typeof value === 'string') {
			return value.split(',').map(peer => {
				const [ip, wsPort] = peer.split(':');
				return {
					ip,
					wsPort: wsPort || 5000,
				};
			});
		}
		return [];
	},

	stringToDelegateList: value => {
		if (typeof value === 'string') {
			return value.split(',').map(delegate => {
				const [publicKey, encryptedPassphrase] = delegate.split('|');
				return {
					publicKey,
					encryptedPassphrase,
				};
			});
		}
		return [];
	},
};
