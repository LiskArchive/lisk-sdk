/*
 * Copyright © 2018 Lisk Foundation
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

export const FIXED_POINT = 10 ** 8;

export const TRANSFER_FEE = 0.1 * FIXED_POINT;
export const IN_TRANSFER_FEE = 0.1 * FIXED_POINT;
export const OUT_TRANSFER_FEE = 0.1 * FIXED_POINT;
export const SIGNATURE_FEE = 5 * FIXED_POINT;
export const DELEGATE_FEE = 25 * FIXED_POINT;
export const VOTE_FEE = 1 * FIXED_POINT;
export const MULTISIGNATURE_FEE = 5 * FIXED_POINT;
export const MULTISIGNATURE_MAX_LIFETIME = 72;
export const MULTISIGNATURE_MIN_LIFETIME = 1;
export const MULTISIGNATURE_MAX_KEYSGROUP = 15;
export const MULTISIGNATURE_MIN_KEYSGROUP = 1;
export const DAPP_FEE = 25 * FIXED_POINT;
export const USERNAME_MAX_LENGTH = 20;

export const BYTESIZES = {
	TYPE: 1,
	TIMESTAMP: 4,
	MULTISIGNATURE_PUBLICKEY: 32,
	RECIPIENT_ID: 8,
	AMOUNT: 8,
	SIGNATURE_TRANSACTION: 64,
	SECOND_SIGNATURE_TRANSACTION: 64,
	DATA: 64,
};
