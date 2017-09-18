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
/* eslint-disable no-plusplus */
import bignum from 'browserify-bignum';

const typeSizes = {
	TRANSACTION_TYPE: 1,
	TIMESTAMP: 4,
	MULTISIGNATURE_PUBLICKEY: 32,
	RECIPIENT_ID: 8,
	AMOUNT: 8,
	SIGNATURE_TRANSACTION: 64,
	SECOND_SIGNATURE_TRANSACTION: 64,
	DATA: 64,
};

function getAssetData(transaction) {
	/**
	 * @method isSendTransaction
	 * @return {object}
	 */

	function isSendTransaction() {
		return transaction.asset.data
			? Buffer.from(transaction.asset.data, 'utf8')
			: Buffer.alloc(0);
	}

	/**
	 * @method isSignatureTransaction
	 * @return {object}
	 */

	function isSignatureTransaction() {
		return Buffer.from(transaction.asset.signature.publicKey, 'hex');
	}

	/**
	 * @method isDelegateTransaction
	 * @return {object}
	 */

	function isDelegateTransaction() {
		return Buffer.from(transaction.asset.delegate.username, 'utf8');
	}

	/**
	 * @method isVoteTransaction
	 * @return {object}
	 */

	function isVoteTransaction() {
		return Buffer.from(transaction.asset.votes.join(''));
	}

	/**
	 * @method isMultisignatureTransaction
	 * @return {object}
	 */

	function isMultisignatureTransaction() {
		const multisigTransactionAsset = transaction.asset.multisignature;
		const minBuffer = Buffer.alloc(1).fill(multisigTransactionAsset.min);
		const lifetimeBuffer = Buffer.alloc(1).fill(multisigTransactionAsset.lifetime);
		const keysgroupBuffer = Buffer.from(multisigTransactionAsset.keysgroup.join(''));
		const assetBuffer = Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);

		return assetBuffer;
	}

	/**
	 * @method isDappTransaction
	 * @return {object}
	 */

	function isDappTransaction() {
		const dapp = transaction.asset.dapp;
		const dappNameBuffer = Buffer.from(dapp.name);
		const dappDescriptionBuffer = dapp.description ? Buffer.from(dapp.description) : Buffer.from('');
		const dappTagsBuffer = dapp.tags ? Buffer.from(dapp.tags) : Buffer.from('');
		const dappLinkBuffer = Buffer.from(dapp.link);
		const dappIconBuffer = dapp.icon ? Buffer.from(dapp.icon) : Buffer.from('');
		const dappTypeBuffer = Buffer.alloc(4).fill(dapp.type);
		const dappCategoryBuffer = Buffer.alloc(4).fill(dapp.category);
		const dappBuffer = Buffer.concat([
			dappNameBuffer,
			dappDescriptionBuffer,
			dappTagsBuffer, dappLinkBuffer,
			dappIconBuffer,
			dappTypeBuffer,
			dappCategoryBuffer,
		]);

		return dappBuffer;
	}

	/**
	 * @method isDappInTransferTransaction
	 * @return {object}
	 */

	function isDappInTransferTransaction() {
		return Buffer.from(transaction.asset.inTransfer.dappId);
	}

	/**
	 * @method isDappOutTransferTransaction
	 * @return {object}
	 */

	function isDappOutTransferTransaction() {
		const dappOutAppIdBuffer = Buffer.from(transaction.asset.outTransfer.dappId);
		const dappOutTransactionIdBuffer = Buffer.from(transaction.asset.outTransfer.transactionId);
		const transactionAssetBuffer = Buffer.concat([dappOutAppIdBuffer, dappOutTransactionIdBuffer]);

		return transactionAssetBuffer;
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


function getTransactionBuffer(transaction) {
	const transactionType = Buffer.alloc(typeSizes.TRANSACTION_TYPE).fill(transaction.type);

	const transactionTimestamp = Buffer.alloc(typeSizes.TIMESTAMP);
	transactionTimestamp.writeIntLE(transaction.timestamp, 0, typeSizes.TIMESTAMP);

	const transactionSenderPublicKey = Buffer.from(transaction.senderPublicKey, 'hex');

	const transactionRequesterPublicKey = transaction.requesterPublicKey
		? Buffer.from(transaction.requesterPublicKey, 'hex')
		: Buffer.alloc(0);

	const transactionRecipientID = transaction.recipientId
		? Buffer.from(
			bignum(
				transaction.recipientId.slice(0, -1),
			).toBuffer({ size: typeSizes.RECIPIENT_ID }),
		)
		: Buffer.alloc(typeSizes.RECIPIENT_ID).fill(0);

	const transactionAmount = Buffer.alloc(typeSizes.AMOUNT);
	transactionAmount.writeInt32LE(transaction.amount, 0, typeSizes.AMOUNT);

	const transactionAssetData = getAssetData(transaction);

	const transactionSignature = transaction.signature
		? Buffer.from(transaction.signature, 'hex')
		: Buffer.alloc(0);

	const transactionSecondSignature = transaction.signSignature
		? Buffer.from(transaction.signSignature, 'hex')
		: Buffer.alloc(0);

	const transactionBuffer = Buffer.concat([
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

	return transactionBuffer;
}


/**
 * @method getBytes
 * @param transaction Object
 *
 * @return {buffer}
 */

function getTransactionBytes(transaction) {
	return getTransactionBuffer(transaction);
}

module.exports = {
	getTransactionBytes,
};
