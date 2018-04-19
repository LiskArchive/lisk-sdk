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
export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();
export const EPOCH_TIME_SECONDS = Math.floor(EPOCH_TIME.getTime() / 1000);

// Largest possible address. Derived from bignum.fromBuffer(Buffer.from(new Array(8).fill(255))).
export const MAX_ADDRESS_NUMBER = '18446744073709551615';
// Largest possible amount. Derived from bignum.fromBuffer(Buffer.from(new Array(8).fill(255))).
export const MAX_TRANSACTION_AMOUNT = '18446744073709551615';
