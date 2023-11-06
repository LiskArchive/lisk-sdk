/*
 * Copyright © 2022 Lisk Foundation
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

export enum TransactionVerifyResult {
	INVALID = -1,
	PENDING = 0,
	OK = 1,
}

export enum TransactionExecutionResult {
	INVALID = -1,
	FAIL = 0,
	OK = 1,
}
