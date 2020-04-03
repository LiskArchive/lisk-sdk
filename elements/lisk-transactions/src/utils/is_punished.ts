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

const PUNISH_TIME_VOTE = 260000;
const PUNISH_TIME_SELF_VOTE = 780000;

export const isPunished = (
	sender: Account,
	delegateAccount: Account,
	lastBlockHeight: number,
): boolean => {
	if (delegateAccount.delegate.pomHeights.length === 0) {
		return false;
	}
	const lastPomHeight = Math.max(...delegateAccount.delegate.pomHeights);
	const currentHeight = lastBlockHeight + 1;
	const punishTime =
		sender.address === delegateAccount.address
			? PUNISH_TIME_SELF_VOTE
			: PUNISH_TIME_VOTE;
	if (currentHeight - lastPomHeight < punishTime) {
		return true;
	}

	return false;
};
