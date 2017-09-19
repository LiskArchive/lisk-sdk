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

const byteSizes = {
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
 * @method getAssetBytes
 * @return {Buffer}
 */

function getAssetBytesHelper(transaction) {
	/**
	 * @method isSendTransaction
	 * @return {Buffer}
	 */

	function isSendTransaction() {
		return transaction.asset.data
			? Buffer.from(transaction.asset.data, 'utf8')
			: Buffer.alloc(0);
	}

	/**
	 * @method isSignatureTransaction
	 * @return {Buffer}
	 */

	function isSignatureTransaction() {
		return Buffer.from(transaction.asset.signature.publicKey, 'hex');
	}

	/**
	 * @method isDelegateTransaction
	 * @return {Buffer}
	 */

	function isDelegateTransaction() {
		return Buffer.from(transaction.asset.delegate.username, 'utf8');
	}

	/**
	 * @method isVoteTransaction
	 * @return {Buffer}
	 */

	function isVoteTransaction() {
		return Buffer.from(transaction.asset.votes.join(''));
	}

	/**
	 * @method isMultisignatureTransaction
	 * @return {Buffer}
	 */

	function isMultisignatureTransaction() {
		const multisigTransactionAsset = transaction.asset.multisignature;
		const minBuffer = Buffer.alloc(1);
		minBuffer.writeInt8(multisigTransactionAsset.min);
		const lifetimeBuffer = Buffer.alloc(1);
		lifetimeBuffer.writeInt8(multisigTransactionAsset.lifetime);
		const keysgroupBuffer = Buffer.from(multisigTransactionAsset.keysgroup.join(''));

		return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
	}

	/**
	 * @method isDappTransaction
	 * @return {Buffer}
	 */

	function isDappTransaction() {
		const dapp = transaction.asset.dapp;
		const dappNameBuffer = Buffer.from(dapp.name);
		const dappDescriptionBuffer = dapp.description ? Buffer.from(dapp.description) : Buffer.from('');
		const dappTagsBuffer = dapp.tags ? Buffer.from(dapp.tags) : Buffer.from('');
		const dappLinkBuffer = Buffer.from(dapp.link);
		const dappIconBuffer = dapp.icon ? Buffer.from(dapp.icon) : Buffer.from('');
		const dappTypeBuffer = Buffer.alloc(4);
		dappTypeBuffer.writeInt8(dapp.type);
		const dappCategoryBuffer = Buffer.alloc(4);
		dappCategoryBuffer.writeInt8(dapp.category);

		return Buffer.concat([
			dappNameBuffer,
			dappDescriptionBuffer,
			dappTagsBuffer, dappLinkBuffer,
			dappIconBuffer,
			dappTypeBuffer,
			dappCategoryBuffer,
		]);
	}

	/**
	 * @method isDappInTransferTransaction
	 * @return {Buffer}
	 */

	function isDappInTransferTransaction() {
		return Buffer.from(transaction.asset.inTransfer.dappId);
	}

	/**
	 * @method isDappOutTransferTransaction
	 * @return {Buffer}
	 */

	function isDappOutTransferTransaction() {
		const dappOutAppIdBuffer = Buffer.from(transaction.asset.outTransfer.dappId);
		const dappOutTransactionIdBuffer = Buffer.from(transaction.asset.outTransfer.transactionId);

		return Buffer.concat([dappOutAppIdBuffer, dappOutTransactionIdBuffer]);
	}

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

	return transactionType[transaction.type]();
}

export class Transaction {
	constructor(transaction) {
		this.byteSizes = byteSizes;
		this.transaction = transaction;

		this.transactionType = Buffer.alloc(this.byteSizes.TYPE);
		this.transactionType.writeInt8(transaction.type);

		this.transactionTimestamp = Buffer.alloc(this.byteSizes.TIMESTAMP);
		this.transactionTimestamp.writeIntLE(transaction.timestamp, 0, this.byteSizes.TIMESTAMP);

		this.transactionSenderPublicKey = Buffer.from(transaction.senderPublicKey, 'hex');
		this.transactionRequesterPublicKey = transaction.requesterPublicKey
			? Buffer.from(transaction.requesterPublicKey, 'hex')
			: Buffer.alloc(0);

		this.transactionRecipientID = transaction.recipientId
			? Buffer.from(
				bignum(
					transaction.recipientId.slice(0, -1),
				).toBuffer({ size: this.byteSizes.RECIPIENT_ID }),
			)
			: Buffer.alloc(this.byteSizes.RECIPIENT_ID).fill(0);

		this.transactionAmount = Buffer.alloc(this.byteSizes.AMOUNT);
		this.transactionAmount.writeInt32LE(transaction.amount, 0, this.byteSizes.AMOUNT);

		this.transactionAssetData = this.getAssetBytes(transaction);

		this.transactionSignature = transaction.signature
			? Buffer.from(transaction.signature, 'hex')
			: Buffer.alloc(0);

		this.transactionSecondSignature = transaction.signSignature
			? Buffer.from(transaction.signSignature, 'hex')
			: Buffer.alloc(0);


		if (!this.checkTransaction()) return false;
	}

	get transactionBytes() {
		return this.concatTransactionBytes();
	}

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

	getAssetBytes() {
		return getAssetBytesHelper(this.transaction);
	}

	checkTransaction() {
		if (this.transactionType > byteSizes.TYPE) {
			throw new Error('Transaction type shall not be bigger than 1 byte.');
		}

		if (this.transaction.type === 0 && this.transaction.asset.data) {
			if (this.transaction.asset.data.length > byteSizes.DATA
				|| this.transactionAssetData.length > byteSizes.DATA) {
				throw new Error(`Transaction asset data exceeds size of ${byteSizes.DATA}.`);
			}
		}
	}
}

export function getTransactionBytes(transaction) {
	return new Transaction(transaction).transactionBytes;
}
