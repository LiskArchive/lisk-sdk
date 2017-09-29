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

const fixedPoint = 10 ** 8;

const sendFee = 0.1 * fixedPoint;
const dataFee = 0.1 * fixedPoint;
const signatureFee = 5 * fixedPoint;
const delegateFee = 25 * fixedPoint;
const voteFee = 1 * fixedPoint;
const multisignatureFee = 5 * fixedPoint;
const dappFee = 25 * fixedPoint;

export default {
	fixedPoint,
	fees: {
		send: sendFee,
		signature: signatureFee,
		delegate: delegateFee,
		vote: voteFee,
		multisignature: multisignatureFee,
		dapp: dappFee,
		data: dataFee,
	},
	fee: {
		0: sendFee,
		1: signatureFee,
		2: delegateFee,
		3: voteFee,
		4: multisignatureFee,
		5: dappFee,
	},
};
