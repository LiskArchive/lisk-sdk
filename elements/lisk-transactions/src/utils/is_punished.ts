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
import { Account } from '../transaction_types';

const VOTER_PUNISH_TIME = 260000;
const SELF_VOTE_PUNISH_TIME = 780000;

export const getPunishmentPeriod = (
	sender: Account,
	delegateAccount: Account,
	lastBlockHeight: number,
): number => {
	if (delegateAccount.delegate.pomHeights.length === 0) {
		return 0;
	}
	const lastPomHeight = Math.max(...delegateAccount.delegate.pomHeights);
	const currentHeight = lastBlockHeight + 1;
	const punishTime =
		sender.address === delegateAccount.address
			? SELF_VOTE_PUNISH_TIME
			: VOTER_PUNISH_TIME;

	return punishTime - (currentHeight - lastPomHeight);
};
