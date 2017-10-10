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
/**
 * `constants` are the objects containing information about the fee size for different tranasctions.
 *
 * @property constants
 * @static
 * @type object
 */

export const FIXED_POINT = 10 ** 8;
export const SEND_FEE = 0.1 * FIXED_POINT;
export const DATA_FEE = 0.1 * FIXED_POINT;
export const IN_TRANSFER_FEE = 0.1 * FIXED_POINT;
export const OUT_TRANSFER_FEE = 0.1 * FIXED_POINT;
export const SIGNATURE_FEE = 5 * FIXED_POINT;
export const DELEGATE_FEE = 25 * FIXED_POINT;
export const VOTE_FEE = 1 * FIXED_POINT;
export const MULTISIGNATURE_FEE = 5 * FIXED_POINT;
export const DAPP_FEE = 25 * FIXED_POINT;
export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();
export const EPOCH_TIME_SECONDS = EPOCH_TIME.getTime() / 1000;
