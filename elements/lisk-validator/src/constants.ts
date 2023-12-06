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

export const MAX_SINT32 = 2147483647; // (2 ** (32 - 1)) - 1
export const MIN_SINT32 = MAX_SINT32 * -1 - 1; // (2 ** (32 - 1)) * -1
export const MAX_UINT32 = 4294967295; // (2 ** 32) - 1
export const MAX_UINT64 = BigInt('18446744073709551615'); // BigInt((2 ** 64) - 1) - BigInt(1)
export const MAX_SINT64 = BigInt('9223372036854775807'); // BigInt(2 ** (64 - 1) - 1) - BigInt(1)
export const MIN_SINT64 = MAX_SINT64 * BigInt(-1) - BigInt(1); // BigInt(2 ** (64 - 1)) * BigInt(-1)
