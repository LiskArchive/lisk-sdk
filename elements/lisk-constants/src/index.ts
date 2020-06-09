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
 *
 */

// Largest possible number which can be stored in eight bytes.
// Derived from bignum.fromBuffer(Buffer.from(new Array(8).fill(255))).
const MAX_EIGHT_BYTE_NUMBER = '18446744073709551615';

export const MAX_ADDRESS_NUMBER = MAX_EIGHT_BYTE_NUMBER;
export const MAX_TRANSACTION_ID = MAX_EIGHT_BYTE_NUMBER;
// Largest possible amount. Maximum value for PostgreSQL bigint.
export const MAX_TRANSACTION_AMOUNT = '9223372036854775807';

export const SIGNED_MESSAGE_PREFIX = 'Lisk Signed Message:\n';

export const TESTNET_NETHASH =
	'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
export const MAINNET_NETHASH =
	'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
export const COMMUNITY_IDENTIFIER = 'Lisk';
