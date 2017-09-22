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

const BYTESIZES = {
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
 * @method isSendTransaction
 * @return {Buffer}
 */

function isSendTransaction(asset) {
	return asset.data
		? Buffer.from(asset.data, 'utf8')
		: Buffer.alloc(0);
}

/**
 * @method isSignatureTransaction
 * @return {Buffer}
 */

function isSignatureTransaction(asset) {
	return Buffer.from(asset.signature.publicKey, 'hex');
}

/**
 * @method isDelegateTransaction
 * @return {Buffer}
 */

function isDelegateTransaction(asset) {
	return Buffer.from(asset.delegate.username, 'utf8');
}

/**
 * @method isVoteTransaction
 * @return {Buffer}
 */

function isVoteTransaction(asset) {
	return Buffer.from(asset.votes.join(''), 'utf8');
}

/**
 * @method isMultisignatureTransaction
 * @return {Buffer}
 */

function isMultisignatureTransaction(asset) {
	const multisigTransactionAsset = asset.multisignature;
	const minBuffer = Buffer.alloc(1, multisigTransactionAsset.min);
	const lifetimeBuffer = Buffer.alloc(1, multisigTransactionAsset.lifetime);
	const keysgroupBuffer = Buffer.from(multisigTransactionAsset.keysgroup.join(''), 'utf8');

	return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
}

/**
 * @method isDappTransaction
 * @return {Buffer}
 */

function isDappTransaction(asset) {
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
 * @method isDappInTransferTransaction
 * @return {Buffer}
 */

function isDappInTransferTransaction(asset) {
	return Buffer.from(asset.inTransfer.dappId, 'utf8');
}

/**
 * @method isDappOutTransferTransaction
 * @return {Buffer}
 */

function isDappOutTransferTransaction(asset) {
	const dappOutAppIdBuffer = Buffer.from(asset.outTransfer.dappId, 'utf8');
	const dappOutTransactionIdBuffer = Buffer.from(asset.outTransfer.transactionId, 'utf8');

	return Buffer.concat([dappOutAppIdBuffer, dappOutTransactionIdBuffer]);
}

/**
 * @method getAssetBytesHelper
 * @return {Buffer}
 */

function getAssetBytesHelper(transaction) {
	const transactionType = {
		0: isSendTransaction,
		1: isSignatureTransaction,
		2: isDelegateTransaction,
		3: isVoteTransaction,
		4: isMultisignatureTransaction,
		5: isDappTransaction,
		6: isDappInTransferTransaction,
		7: isDappOutTransferTransaction,
	};

	return transactionType[transaction.type](transaction.asset);
}

/**
* A utility class to get transaction byteSizes
*
* @class Transaction
* @param {Object} transaction
* @constructor
*/

export class Transaction {
	constructor(transaction) {
		this.transaction = transaction;

		this.transactionType = Buffer.alloc(BYTESIZES.TYPE);
		this.transactionType.writeInt8(transaction.type);

		this.transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		this.transactionTimestamp.writeIntLE(transaction.timestamp, 0, BYTESIZES.TIMESTAMP);

		this.transactionSenderPublicKey = Buffer.from(transaction.senderPublicKey, 'hex');
		this.transactionRequesterPublicKey = transaction.requesterPublicKey
			? Buffer.from(transaction.requesterPublicKey, 'hex')
			: Buffer.alloc(0);

		this.transactionRecipientID = transaction.recipientId
			? Buffer.from(
				bignum(
					transaction.recipientId.slice(0, -1),
				).toBuffer({ size: BYTESIZES.RECIPIENT_ID }),
			)
			: Buffer.alloc(BYTESIZES.RECIPIENT_ID).fill(0);

		this.transactionAmount = Buffer.alloc(BYTESIZES.AMOUNT);
		this.transactionAmount.writeInt32LE(transaction.amount, 0, BYTESIZES.AMOUNT);

		this.transactionAssetData = this.getAssetBytes(transaction);

		this.transactionSignature = transaction.signature
			? Buffer.from(transaction.signature, 'hex')
			: Buffer.alloc(0);

		this.transactionSecondSignature = transaction.signSignature
			? Buffer.from(transaction.signSignature, 'hex')
			: Buffer.alloc(0);


		this.checkTransaction();
		return this;
	}

	/**
	 * @method get transactionBytes
	 * @return {Buffer}
	 */

	get transactionBytes() {
		return this.concatTransactionBytes();
	}

	/**
	 * @method concatTransactionBytes
	 * @private
	 * @return {Buffer}
	 */

	concatTransactionBytes() {
		return Buffer.concat([
			this.transactionType,
			this.transactionTimestamp,
			this.transactionSenderPublicKey,
			this.transactionRequesterPublicKey,
			this.transactionRecipientID,
			this.transactionAmount,
			this.transactionAssetData,
			this.transactionSignature,
			this.transactionSecondSignature,
		]);
	}

	/**
	 * @method getAssetBytes
	 * @private
	 * @return {Buffer}
	 */

	getAssetBytes() {
		return getAssetBytesHelper(this.transaction);
	}

	/**
	 * @method checkTransaction
	 * @throws
	 * @return {}
	 */

	checkTransaction() {
		if (this.transaction.type === 0 && this.transaction.asset.data) {
			if (this.transaction.asset.data.length > BYTESIZES.DATA
				|| this.transactionAssetData.length > BYTESIZES.DATA) {
				throw new Error(`Transaction asset data exceeds size of ${BYTESIZES.DATA}.`);
			}
		}
	}
}

export function getTransactionBytes(transaction) {
	return new Transaction(transaction).transactionBytes;
}
