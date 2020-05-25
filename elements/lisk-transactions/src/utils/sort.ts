/*
 * Copyright © 2020 Lisk Foundation
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

import { AccountUnlocking } from '../types';

export const sortKeysAscending = (publicKeys: string[]): string[] =>
	publicKeys.sort((publicKeyA, publicKeyB) => {
		if (publicKeyA > publicKeyB) {
			return 1;
		}
		if (publicKeyA < publicKeyB) {
			return -1;
		}

		return 0;
	});

export const sortUnlocking = (unlockings: AccountUnlocking[]): void => {
	unlockings.sort((a, b) => {
		if (a.delegateAddress !== b.delegateAddress) {
			return a.delegateAddress.localeCompare(b.delegateAddress, 'en');
		}
		if (a.unvoteHeight !== b.unvoteHeight) {
			return b.unvoteHeight - a.unvoteHeight;
		}
		const diff = b.amount - a.amount;
		if (diff > BigInt(0)) {
			return 1;
		}
		if (diff < BigInt(0)) {
			return -1;
		}

		return 0;
	});
};
