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
 * Signature module provides functions for creating second signature registration transactions.
 * @class signature
 */
import cryptoModule from '../crypto';
import { SIGNATURE_FEE } from '../constants';
import { prepareTransaction, getTimeWithOffset } from './utils';

/**
 * @method newSignature
 * @param secondPassphrase
 *
 * @return {Object}
 */

const createAsset = secondPassphrase => {
	const { publicKey } = cryptoModule.getKeys(secondPassphrase);
	return { signature: { publicKey } };
};

/**
 * @method registerSecondPassphrase
 * @param {Object} Object - Object
 * @param {String} Object.passphrase
 * @param {String} Object.secondPassphrase
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

const registerSecondPassphrase = ({
	passphrase,
	secondPassphrase,
	timeOffset,
	unsigned,
}) => {
	const senderPublicKey = unsigned
		? null
		: cryptoModule.getKeys(passphrase).publicKey;

	const transaction = {
		type: 1,
		amount: '0',
		fee: SIGNATURE_FEE.toString(),
		recipientId: null,
		senderPublicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: createAsset(secondPassphrase),
	};

	return unsigned
		? transaction
		: prepareTransaction(transaction, passphrase, secondPassphrase);
};

export default registerSecondPassphrase;
