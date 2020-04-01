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
/* tslint:disable:no-magic-numbers */
export const FIXED_POINT = 10 ** 8;

export const MIN_FEE_PER_BYTE = 1000;
export const DELEGATE_NAME_FEE = 1000000000;
export const DAPP_FEE = FIXED_POINT * 25;
export const USERNAME_MAX_LENGTH = 20;
export const MAX_NUMBER_OF_SIGNATURES = 64;
export const MIN_NUMBER_OF_SIGNATURES = 1;
export const MAX_NUMBER_OF_KEYS = 64;
export const MIN_NUMBER_OF_KEYS = 0;

export const BYTESIZES = {
	TYPE: 1,
	NONCE: 8,
	FEE: 8,
	TIMESTAMP: 4,
	MULTISIGNATURE_PUBLICKEY: 32,
	RECIPIENT_ID: 8,
	AMOUNT: 8,
	SIGNATURE_TRANSACTION: 64,
	DATA: 64,
};

export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();
const MS_FACTOR = 1000;
export const EPOCH_TIME_SECONDS = Math.floor(EPOCH_TIME.getTime() / MS_FACTOR);

// Largest possible number which can be stored in eight bytes.
// Derived from bignum.fromBuffer(Buffer.from(new Array(8).fill(255))).
const MAX_EIGHT_BYTE_NUMBER = '18446744073709551615';

export const MAX_ADDRESS_NUMBER = MAX_EIGHT_BYTE_NUMBER;
export const MAX_TRANSACTION_ID = MAX_EIGHT_BYTE_NUMBER;
// Largest possible amount. Maximum value for PostgreSQL bigint.
export const MAX_INT64 = '9223372036854775807';
export const MAX_TRANSACTION_AMOUNT = MAX_INT64;
export const MAX_MULTISIG_SIGNATURES = 15;
export const MAX_PUBLIC_KEY_LENGTH = 32;
export const MAX_TRANSFER_ASSET_DATA_LENGTH = 64;
export const NETWORK_IDENTIFIER_LENGTH = 32;
