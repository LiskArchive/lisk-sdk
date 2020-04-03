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

import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	UnlockTransaction,
	MultisignatureTransaction,
	BaseTransaction,
} from '@liskhq/lisk-transactions';

export const registeredTransactions: {
	[key: number]: typeof BaseTransaction;
} = {
	8: TransferTransaction,
	10: DelegateTransaction,
	12: MultisignatureTransaction,
	13: VoteTransaction,
	14: UnlockTransaction,
};
