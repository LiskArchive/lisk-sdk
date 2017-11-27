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
import crypto from '../../crypto';
import getTransactionHash from './getTransactionHash';

/**
 * @method signTransaction
 * @param transaction Object
 * @param passphrase string
 *
 * @return {string}
 */

export const signTransaction = (transaction, passphrase) => {
	const transactionHash = getTransactionHash(transaction);
	return crypto.signData(transactionHash, passphrase);
};

/**
 * @method multiSignTransaction
 * @param transaction Object
 * @param passphrase string
 *
 * @return {string}
 */

export const multiSignTransaction = (transaction, passphrase) => {
	const transactionToSign = Object.assign({}, transaction);
	delete transactionToSign.signature;
	delete transactionToSign.signSignature;

	const transactionHash = getTransactionHash(transactionToSign);

	return crypto.signData(transactionHash, passphrase);
};

/**
 * @method verifyTransaction
 * @param transaction Object
 * @param secondPublicKey
 *
 * @return {boolean}
 */

export const verifyTransaction = (transaction, secondPublicKey) => {
	const secondSignaturePresent = !!transaction.signSignature;
	if (secondSignaturePresent && !secondPublicKey) {
		throw new Error('Cannot verify signSignature without secondPublicKey.');
	}

	const transactionWithoutSignature = Object.assign({}, transaction);

	if (secondSignaturePresent) {
		delete transactionWithoutSignature.signSignature;
	} else {
		delete transactionWithoutSignature.signature;
	}

	const transactionHash = getTransactionHash(transactionWithoutSignature);

	const publicKey = secondSignaturePresent
		? secondPublicKey
		: transaction.senderPublicKey;
	const signature = secondSignaturePresent
		? transaction.signSignature
		: transaction.signature;

	const verified = crypto.verifyData(transactionHash, signature, publicKey);

	return secondSignaturePresent
		? verified && verifyTransaction(transactionWithoutSignature)
		: verified;
};
