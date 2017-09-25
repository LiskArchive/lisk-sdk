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
 * @method checkRequiredFields
 * @param  {Array} requiredFields
 * @param  {Object} data
 * @throws
 * @return {Boolean}
 */

export function checkRequiredFields(requiredFields, data) {
	requiredFields.forEach((parameter) => {
		const dataFields = Object.keys(data);
		if (!dataFields.includes(parameter)) {
			throw new Error(`${parameter} is a required parameter.`);
		}
	});
	return true;
}

/**
 * @method getAssetDataForSendTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForSendTransaction({ data }) {
	return data
		? Buffer.from(data, 'utf8')
		: Buffer.alloc(0);
}

/**
 * @method getAssetDataForSignatureTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForSignatureTransaction({ signature }) {
	checkRequiredFields(['publicKey'], signature);
	const { publicKey } = signature;
	return Buffer.from(publicKey, 'hex');
}

/**
 * @method getAssetDataForDelegateTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDelegateTransaction({ delegate }) {
	checkRequiredFields(['username'], delegate);
	const { username } = delegate;
	return Buffer.from(username, 'utf8');
}

/**
 * @method getAssetDataForVotesTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForVotesTransaction({ votes }) {
	if (!Array.isArray(votes)) {
		throw new Error('votes parameter must be an Array.');
	}
	return Buffer.from(votes.join(''), 'utf8');
}

/**
 * @method getAssetDataForMultisignatureTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForMultisignatureTransaction({ multisignature }) {
	checkRequiredFields(['min', 'lifetime', 'keysgroup'], multisignature);
	const { min, lifetime, keysgroup } = multisignature;
	const minBuffer = Buffer.alloc(1, min);
	const lifetimeBuffer = Buffer.alloc(1, lifetime);
	const keysgroupBuffer = Buffer.from(keysgroup.join(''), 'utf8');

	return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
}

/**
 * @method getAssetDataForDappTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDappTransaction({ dapp }) {
	checkRequiredFields(['name', 'link', 'type', 'category'], dapp);
	const { name, description, tags, link, icon, type, category } = dapp;
	const dappNameBuffer = Buffer.from(name, 'utf8');
	const dappLinkBuffer = Buffer.from(link, 'utf8');
	const dappTypeBuffer = Buffer.alloc(4, type);
	const dappCategoryBuffer = Buffer.alloc(4, category);

	const dappDescriptionBuffer = description ? Buffer.from(description, 'utf8') : Buffer.alloc(0);
	const dappTagsBuffer = tags ? Buffer.from(tags, 'utf8') : Buffer.alloc(0);
	const dappIconBuffer = icon ? Buffer.from(icon, 'utf8') : Buffer.alloc(0);

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

export function getAssetDataForDappInTransaction({ inTransfer }) {
	checkRequiredFields(['dappId'], inTransfer);
	const { dappId } = inTransfer;
	return Buffer.from(dappId, 'utf8');
}

/**
 * @method getASsetDataForDappOutTransaction
 * @param {Object} transactionAsset
 * @return {Buffer}
 */

export function getAssetDataForDappOutTransaction({ outTransfer }) {
	checkRequiredFields(['dappId', 'transactionId'], outTransfer);
	const { dappId, transactionId } = outTransfer;
	const dappOutAppIdBuffer = Buffer.from(dappId, 'utf8');
	const dappOutTransactionIdBuffer = Buffer.from(transactionId, 'utf8');

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

const REQUIRED_TRANSACTION_PARAMETER = [
	'type',
	'timestamp',
	'senderPublicKey',
	'amount',
];

/**
* A utility class to get transaction byteSizes
*
* @class TransactionBytes
* @param {Object} transaction
* @constructor
*/

export function getTransactionBytes(transaction) {
	checkTransaction(transaction);
	checkRequiredFields(REQUIRED_TRANSACTION_PARAMETER, transaction);

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
