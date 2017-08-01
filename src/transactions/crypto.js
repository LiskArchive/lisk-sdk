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
 * Crypto module provides functions for byte/fee calculation, hash/address/id/keypair generation,
 * plus signing and verifying of transactions.
 * @class crypto
 */
/* eslint-disable no-plusplus */
import crypto from 'crypto-browserify';
import ByteBuffer from 'bytebuffer';
import bignum from 'browserify-bignum';
import constants from '../constants';
import cryptoModule from './crypto/index';

/**
 * @method getTransactionBytes
 * @param transaction Object
 * @return {object}
 */

function getTransactionBytes(transaction) {
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
		const bb = new ByteBuffer(32, true);
		const publicKey = transaction.asset.signature.publicKey;
		const publicKeyBuffer = Buffer.from(publicKey, 'hex');

		for (let i = 0; i < publicKeyBuffer.length; i++) {
			bb.writeByte(publicKeyBuffer[i]);
		}

		bb.flip();
		const signatureBytes = new Uint8Array(bb.toArrayBuffer());

		return {
			assetBytes: signatureBytes,
			assetSize: 32,
		};
	}

	/**
	 * @method isDelegateTransaction
	 * @return {object}
	 */

	function isDelegateTransaction() {
		return {
			assetBytes: Buffer.from(transaction.asset.delegate.username),
			assetSize: Buffer.from(transaction.asset.delegate.username).length,
		};
	}

	/**
	 * @method isVoteTransaction
	 * @return {object}
	 */

	function isVoteTransaction() {
		const voteTransactionBytes = (Buffer.from(transaction.asset.votes.join('')) || null);

		return {
			assetBytes: voteTransactionBytes,
			assetSize: (voteTransactionBytes.length || 0),
		};
	}

	/**
	 * @method isMultisignatureTransaction
	 * @return {object}
	 */

	function isMultisignatureTransaction() {
		const MINSIGNATURES = 1;
		const LIFETIME = 1;
		const keysgroupBuffer = Buffer.from(transaction.asset.multisignature.keysgroup.join(''), 'utf8');

		const bb = new ByteBuffer(MINSIGNATURES + LIFETIME + keysgroupBuffer.length, true);
		bb.writeByte(transaction.asset.multisignature.min);
		bb.writeByte(transaction.asset.multisignature.lifetime);
		for (let i = 0; i < keysgroupBuffer.length; i++) {
			bb.writeByte(keysgroupBuffer[i]);
		}
		bb.flip();

		bb.toBuffer();
		const multiSigBuffer = new Uint8Array(bb.toArrayBuffer());

		return {
			assetBytes: multiSigBuffer,
			assetSize: multiSigBuffer.length,
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
		const buf = Buffer.from(transaction.asset.inTransfer.dappId);

		return {
			assetBytes: buf,
			assetSize: buf.length,
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
 * @param options String
 * @return {buffer}
 */

function createTransactionBuffer(transaction, options) {
	function assignHexToTransactionBytes(partTransactionBuffer, hexValue) {
		const hexBuffer = Buffer.from(hexValue, 'hex');
		for (let i = 0; i < hexBuffer.length; i++) {
			partTransactionBuffer.writeByte(hexBuffer[i]);
		}
		return partTransactionBuffer;
	}

	/**
	 * @method createEmptyTransactionBuffer
	 * @param assetSize number
	 * @return {buffer}
	 */

	function createEmptyTransactionBuffer(assetSize) {
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

		const totalBytes = Object.values(typeSizes)
			.reduce((sum, typeSize) => sum + typeSize, 0);

		return new ByteBuffer(totalBytes + assetSize, true);
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

		if (options !== 'multisignature') {
			if (transaction.signature) {
				assignHexToTransactionBytes(transactionBuffer, transaction.signature);
			}

			if (transaction.signSignature) {
				assignHexToTransactionBytes(transactionBuffer, transaction.signSignature);
			}
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
	const transactionAssetSizeBuffer = getTransactionBytes(transaction);
	const assetSize = transactionAssetSizeBuffer.assetSize;
	const assetBytes = transactionAssetSizeBuffer.assetBytes;

	const emptyTransactionBuffer = createEmptyTransactionBuffer(assetSize);
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

function getBytes(transaction, options) {
	return createTransactionBuffer(transaction, options);
}

/**
 * @method getId
 * @param transaction Object
 *
 * @return {string}
 */

function getId(transaction) {
	const hash = crypto.createHash('sha256').update(getBytes(transaction).toString('hex'), 'hex').digest();
	const temp = Buffer.alloc(8);
	for (let i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	const id = bignum.fromBuffer(temp).toString();
	return id;
}

/**
 * @method getHash
 * @param transaction Object
 *
 * @return {string}
 */

function getHash(transaction) {
	const bytes = getBytes(transaction);
	return crypto.createHash('sha256').update(bytes).digest();
}

/**
 * @method getFee
 * @param transaction Object
 *
 * @return {number}
 */

function getFee(transaction) {
	return constants.fee[transaction.type];
}

/**
 * @method sign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function sign(transaction, keys) {
	const hash = getHash(transaction);
	const signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));
	return Buffer.from(signature).toString('hex');
}

/**
 * @method secondSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function secondSign(transaction, keys) {
	const hash = getHash(transaction);
	const signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));
	return Buffer.from(signature).toString('hex');
}

/**
 * @method multiSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function multiSign(transaction, keys) {
	const bytes = getBytes(transaction, 'multisignature');
	const hash = crypto.createHash('sha256').update(bytes).digest();
	const signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));

	return Buffer.from(signature).toString('hex');
}

/**
 * @method verify
 * @param transaction Object
 *
 * @return {boolean}
 */

function verify(transaction) {
	let remove = 64;

	if (transaction.signSignature) {
		remove = 128;
	}

	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - remove);

	for (let i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	const hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signatureBuffer = Buffer.from(transaction.signature, 'hex');
	const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
	const res = naclInstance
		.crypto_sign_verify_detached(signatureBuffer, hash, senderPublicKeyBuffer);

	return res;
}

/**
 * @method verifySecondSignature
 * @param transaction Object
 * @param publicKey Object
 *
 * @return {boolean}
 */

function verifySecondSignature(transaction, publicKey) {
	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - 64);

	for (let i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	const hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
	const publicKeyBuffer = Buffer.from(publicKey, 'hex');
	const res = naclInstance.crypto_sign_verify_detached(signSignatureBuffer, hash, publicKeyBuffer);

	return res;
}

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

function getKeys(secret) {
	const hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	const keypair = naclInstance.crypto_sign_keypair_from_seed(hash);

	return {
		publicKey: Buffer.from(keypair.signPk).toString('hex'),
		privateKey: Buffer.from(keypair.signSk).toString('hex'),
	};
}

/**
 * @method getAddress
 * @param publicKey string
 *
 * @return {hex publicKey}
 */

function getAddress(publicKey) {
	const publicKeyHash = crypto.createHash('sha256').update(publicKey.toString('hex'), 'hex').digest();
	const temp = Buffer.alloc(8);

	for (let i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	const address = `${bignum.fromBuffer(temp).toString()}L`;
	return address;
}

module.exports = {
	getBytes,
	getHash,
	getId,
	getFee,
	sign,
	secondSign,
	multiSign,
	getKeys,
	getAddress,
	verify,
	verifySecondSignature,

	bufferToHex: cryptoModule.bufferToHex,
	hexToBuffer: cryptoModule.hexToBuffer,
	useFirstEightBufferEntriesReversed: cryptoModule.useFirstEightBufferEntriesReversed,
	verifyMessageWithPublicKey: cryptoModule.verifyMessageWithPublicKey,
	signMessageWithSecret: cryptoModule.signMessageWithSecret,
	signAndPrintMessage: cryptoModule.signAndPrintMessage,
	printSignedMessage: cryptoModule.printSignedMessage,
	getPrivateAndPublicKeyFromSecret: cryptoModule.getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: cryptoModule.getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: cryptoModule.getAddressFromPublicKey,
	getSha256Hash: cryptoModule.getSha256Hash,
	encryptMessageWithSecret: cryptoModule.encryptMessageWithSecret,
	decryptMessageWithSecret: cryptoModule.decryptMessageWithSecret,
	convertPublicKeyEd2Curve: cryptoModule.convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve: cryptoModule.convertPrivateKeyEd2Curve,
	toAddress: cryptoModule.toAddress,
	signMessageWithTwoSecrets: cryptoModule.signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys: cryptoModule.verifyMessageWithTwoPublicKeys,
};
