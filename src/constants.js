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

export const fixedPoint = 10 ** 8;
export const sendFee = 0.1 * fixedPoint;
export const dataFee = 0.1 * fixedPoint;
export const inTransferFee = 0.1 * fixedPoint;
export const outTransferFee = 0.1 * fixedPoint;
export const signatureFee = 5 * fixedPoint;
export const delegateFee = 25 * fixedPoint;
export const voteFee = 1 * fixedPoint;
export const multisignatureFee = 5 * fixedPoint;
export const dappFee = 25 * fixedPoint;
