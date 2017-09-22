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
import bignum from 'browserify-bignum';

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

/**
 * @method getAssetDataForSendTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForSendTransaction(asset) {
	return asset.data
		? Buffer.from(asset.data, 'utf8')
		: Buffer.alloc(0);
}

/**
 * @method getAssetDataForSignatureTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForSignatureTransaction(asset) {
	return Buffer.from(asset.signature.publicKey, 'hex');
}

/**
 * @method getAssetDataForDelegateTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDelegateTransaction(asset) {
	return Buffer.from(asset.delegate.username, 'utf8');
}

/**
 * @method getAssetDataForVotesTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForVotesTransaction(asset) {
	return Buffer.from(asset.votes.join(''), 'utf8');
}

/**
 * @method getAssetDataForMultisignatureTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForMultisignatureTransaction(asset) {
	const multisigTransactionAsset = asset.multisignature;
	const minBuffer = Buffer.alloc(1, multisigTransactionAsset.min);
	const lifetimeBuffer = Buffer.alloc(1, multisigTransactionAsset.lifetime);
	const keysgroupBuffer = Buffer.from(multisigTransactionAsset.keysgroup.join(''), 'utf8');

	return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
}

/**
 * @method getAssetDataForDappTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDappTransaction(asset) {
	const dapp = asset.dapp;
	const dappNameBuffer = Buffer.from(dapp.name, 'utf8');
	const dappDescriptionBuffer = dapp.description ? Buffer.from(dapp.description, 'utf8') : Buffer.alloc(0);
	const dappTagsBuffer = dapp.tags ? Buffer.from(dapp.tags) : Buffer.alloc(0);
	const dappLinkBuffer = Buffer.from(dapp.link, 'utf8');
	const dappIconBuffer = dapp.icon ? Buffer.from(dapp.icon) : Buffer.alloc(0);
	const dappTypeBuffer = Buffer.alloc(4, dapp.type);
	const dappCategoryBuffer = Buffer.alloc(4, dapp.category);

	return Buffer.concat([
		dappNameBuffer,
		dappDescriptionBuffer,
		dappTagsBuffer,
		dappLinkBuffer,
		dappIconBuffer,
		dappTypeBuffer,
		dappCategoryBuffer,
	]);
}

/**
 * @method getAssetDataForDappInTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDappInTransaction(asset) {
	return Buffer.from(asset.inTransfer.dappId, 'utf8');
}

/**
 * @method getASsetDataForDappOutTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDappOutTransaction(asset) {
	const dappOutAppIdBuffer = Buffer.from(asset.outTransfer.dappId, 'utf8');
	const dappOutTransactionIdBuffer = Buffer.from(asset.outTransfer.transactionId, 'utf8');

	return Buffer.concat([dappOutAppIdBuffer, dappOutTransactionIdBuffer]);
}

/**
 * @method getAssetBytesHelper
 * @param {Object} transaction
 * @return {Buffer}
 */

export function getAssetBytesHelper(transaction) {
	const assetDataGetters = {
		0: getAssetDataForSendTransaction,
		1: getAssetDataForSignatureTransaction,
		2: getAssetDataForDelegateTransaction,
		3: getAssetDataForVotesTransaction,
		4: getAssetDataForMultisignatureTransaction,
		5: getAssetDataForDappTransaction,
		6: getAssetDataForDappInTransaction,
		7: getAssetDataForDappOutTransaction,
	};

	return assetDataGetters[transaction.type](transaction.asset);
}

/**
 * @method checkTransaction
 * @throws
 */

export function checkTransaction(transaction) {
	if (transaction.asset.data) {
		if (transaction.asset.data.length > BYTESIZES.DATA) {
			throw new Error(`Transaction asset data exceeds size of ${BYTESIZES.DATA}.`);
		}
	}
}

/**
* A utility class to get transaction byteSizes
*
* @class TransactionBytes
* @param {Object} transaction
* @constructor
*/

export function getTransactionBytes(transaction) {
	checkTransaction(transaction);

	const transactionType = Buffer.alloc(BYTESIZES.TYPE);
	transactionType.writeInt8(transaction.type);

	const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
	transactionTimestamp.writeIntLE(transaction.timestamp, 0, BYTESIZES.TIMESTAMP);

	const transactionSenderPublicKey = Buffer.from(transaction.senderPublicKey, 'hex');
	const transactionRequesterPublicKey = transaction.requesterPublicKey
		? Buffer.from(transaction.requesterPublicKey, 'hex')
		: Buffer.alloc(0);

	const transactionRecipientID = transaction.recipientId
		? Buffer.from(
			bignum(
				transaction.recipientId.slice(0, -1),
			).toBuffer({ size: BYTESIZES.RECIPIENT_ID }),
		)
		: Buffer.alloc(BYTESIZES.RECIPIENT_ID).fill(0);

	const transactionAmount = Buffer.alloc(BYTESIZES.AMOUNT);
	transactionAmount.writeInt32LE(transaction.amount, 0, BYTESIZES.AMOUNT);

	const transactionAssetData = getAssetBytesHelper(transaction);

	const transactionSignature = transaction.signature
		? Buffer.from(transaction.signature, 'hex')
		: Buffer.alloc(0);

	const transactionSecondSignature = transaction.signSignature
		? Buffer.from(transaction.signSignature, 'hex')
		: Buffer.alloc(0);

	return Buffer.concat([
		transactionType,
		transactionTimestamp,
		transactionSenderPublicKey,
		transactionRequesterPublicKey,
		transactionRecipientID,
		transactionAmount,
		transactionAssetData,
		transactionSignature,
		transactionSecondSignature,
	]);
}
