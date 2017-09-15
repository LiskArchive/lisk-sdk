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
import ByteBuffer from 'bytebuffer';
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

const sumTypeSizes = Object.values(typeSizes)
	.reduce((sum, typeSize) => sum + typeSize, 0);

/**
 * @method getEmptyBytesForTransaction
 * @param transaction Object
 * @return {object}
 */

function getEmptyBytesForTransaction(transaction) {
	/**
	 * @method isSendTransaction
	 * @return {object}
	 */

	function isSendTransaction() {
		return {
			assetBytes: null,
			assetSize: 0,
		};
	}

	/**
	 * @method isSignatureTransaction
	 * @return {object}
	 */

	function isSignatureTransaction() {
		const transactionAssetBuffer = Buffer.from(transaction.asset.signature.publicKey, 'hex');

		return {
			assetBytes: transactionAssetBuffer,
			assetSize: transactionAssetBuffer.length,
		};
	}

	/**
	 * @method isDelegateTransaction
	 * @return {object}
	 */

	function isDelegateTransaction() {
		const transactionAssetBuffer = Buffer.from(transaction.asset.delegate.username, 'utf8');

		return {
			assetBytes: transactionAssetBuffer,
			assetSize: transactionAssetBuffer.length,
		};
	}

	/**
	 * @method isVoteTransaction
	 * @return {object}
	 */

	function isVoteTransaction() {
		const transactionAssetBuffer = Buffer.from(transaction.asset.votes.join(''));

		return {
			assetBytes: transactionAssetBuffer,
			assetSize: transactionAssetBuffer.length,
		};
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

		return {
			assetBytes: assetBuffer,
			assetSize: assetBuffer.length,
		};
	}

	/**
	 * @method isDappTransaction
	 * @return {object}
	 */

	function isDappTransaction() {
		const dapp = transaction.asset.dapp;
		let buf = Buffer.from(dapp.name);

		if (dapp.description) {
			const descriptionBuf = Buffer.from(dapp.description);
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (dapp.tags) {
			const tagsBuf = Buffer.from(dapp.tags);
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (dapp.link) {
			buf = Buffer.concat([buf, Buffer.from(dapp.link)]);
		}

		if (dapp.icon) {
			buf = Buffer.concat([buf, Buffer.from(dapp.icon)]);
		}

		const bb = new ByteBuffer(4 + 4, true);
		bb.writeInt(dapp.type);
		bb.writeInt(dapp.category);
		bb.flip();

		buf = Buffer.concat([buf, bb.toBuffer()]);

		return {
			assetBytes: buf,
			assetSize: buf.length,
		};
	}

	/**
	 * @method isDappInTransferTransaction
	 * @return {object}
	 */

	function isDappInTransferTransaction() {
		const transactionAssetBuffer = Buffer.from(transaction.asset.inTransfer.dappId);

		return {
			assetBytes: transactionAssetBuffer,
			assetSize: transactionAssetBuffer.length,
		};
	}

	/**
	 * @method isDappOutTransferTransaction
	 * @return {object}
	 */

	function isDappOutTransferTransaction() {
		const dappBuf = Buffer.from(transaction.asset.outTransfer.dappId);
		const transactionBuf = Buffer.from(transaction.asset.outTransfer.transactionId);
		const buf = Buffer.concat([dappBuf, transactionBuf]);

		return {
			assetBytes: buf,
			assetSize: buf.length,
		};
	}

	/**
	 * `transactionType` describes the available transaction types.
	 *
	 * @property transactionType
	 * @type object
	 */

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

/**
 * @method createTransactionBuffer
 * @param transaction Object
 * @return {buffer}
 */

function createTransactionBuffer(transaction) {
	function assignHexToTransactionBytes(partTransactionBuffer, hexValue) {
		const hexBuffer = Buffer.from(hexValue, 'hex');
		for (let i = 0; i < hexBuffer.length; i++) {
			partTransactionBuffer.writeByte(hexBuffer[i]);
		}
		return partTransactionBuffer;
	}

	/**
	 * @method assignTransactionBuffer
	 * @param transactionBuffer buffer
	 * @param assetSize number
	 * @param assetBytes number
	 * @return {buffer}
	 */

	function assignTransactionBuffer(transactionBuffer, assetSize, assetBytes) {
		transactionBuffer.writeInt8(transaction.type);
		transactionBuffer.writeInt(transaction.timestamp);

		assignHexToTransactionBytes(transactionBuffer, transaction.senderPublicKey);

		if (transaction.requesterPublicKey) {
			assignHexToTransactionBytes(transactionBuffer, transaction.requesterPublicKey);
		}

		if (transaction.recipientId) {
			let recipient = transaction.recipientId.slice(0, -1);
			recipient = bignum(recipient).toBuffer({ size: 8 });

			for (let i = 0; i < 8; i++) {
				transactionBuffer.writeByte(recipient[i] || 0);
			}
		} else {
			for (let i = 0; i < 8; i++) {
				transactionBuffer.writeByte(0);
			}
		}
		transactionBuffer.writeLong(transaction.amount);

		if (transaction.asset.data) {
			const dataBuffer = Buffer.from(transaction.asset.data);
			for (let i = 0; i < dataBuffer.length; i++) {
				transactionBuffer.writeByte(dataBuffer[i]);
			}
		}

		if (assetSize > 0) {
			for (let i = 0; i < assetSize; i++) {
				transactionBuffer.writeByte(assetBytes[i]);
			}
		}

		if (transaction.signature) {
			assignHexToTransactionBytes(transactionBuffer, transaction.signature);
		}

		if (transaction.signSignature) {
			assignHexToTransactionBytes(transactionBuffer, transaction.signSignature);
		}

		transactionBuffer.flip();
		const arrayBuffer = new Uint8Array(transactionBuffer.toArrayBuffer());
		const buffer = [];

		for (let i = 0; i < arrayBuffer.length; i++) {
			buffer[i] = arrayBuffer[i];
		}

		return Buffer.from(buffer);
	}

	// Get Transaction Size and Bytes
	const transactionAssetSizeBuffer = getEmptyBytesForTransaction(transaction);
	const assetSize = transactionAssetSizeBuffer.assetSize;
	const assetBytes = transactionAssetSizeBuffer.assetBytes;

	const emptyTransactionBuffer = new ByteBuffer(sumTypeSizes + assetSize, true);
	const assignedTransactionBuffer = assignTransactionBuffer(
		emptyTransactionBuffer, assetSize, assetBytes,
	);

	return assignedTransactionBuffer;
}

/**
 * @method getBytes
 * @param transaction Object
 *
 * @return {buffer}
 */

function getTransactionBytes(transaction) {
	return createTransactionBuffer(transaction);
}

module.exports = {
	getTransactionBytes,
};
