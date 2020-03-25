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
export const MAX_EIGHT_BYTE_NUMBER = '18446744073709551615';
export const MAX_PUBLIC_KEY_LENGTH = 32;
export const MAX_INT32 = 2147483647;
export const MIN_INT32 = MAX_INT32 * -1;
export const MAX_UINT32 = 4294967295;
export const MAX_INT64 = BigInt('9223372036854775807');
export const MIN_INT64 = MAX_INT64 * BigInt(-1) - BigInt(1);
export const MAX_UINT64 = BigInt('18446744073709551615');
