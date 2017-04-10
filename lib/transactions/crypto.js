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
 * Crypto module provides functions for byte/fee calculation, hash/address/id/keypair generation, plus signing and verifying of transactions.
 * @class crypto
 */

var crypto = require('crypto-browserify');
var constants = require('../constants.js');

if (typeof Buffer === 'undefined') {
	Buffer = require('buffer/').Buffer;
}

var ByteBuffer = require('bytebuffer');
var bignum = require('browserify-bignum');

/**
 * `fixedPoint` is the size we calculate numbers in. 10^8
 * @property fixedPoint
 * @static
 * @final
 * @type Number
 */

var fixedPoint = Math.pow(10, 8);

/**
 * @method getTransactionBytes
 * @param transaction Object
 * @return {object}
 */

function getTransactionBytes (transaction) {

	function isSendTransaction () {

		return {
			assetBytes: null,
			assetSize: 0
		}
	}

	function isSignatureTransaction () {

		var bb = new ByteBuffer(32, true);
		var publicKey = transaction.asset.signature.publicKey;
		var publicKeyBuffer = Buffer.from(publicKey, 'hex');

		for (var i = 0; i < publicKeyBuffer.length; i++) {
			bb.writeByte(publicKeyBuffer[i]);
		}

		bb.flip();
		var signatureBytes = new Uint8Array(bb.toArrayBuffer());

		return {
			assetBytes: signatureBytes,
			assetSize: 32
		};
	}

	function isDelegateTransaction () {

		return {
			assetBytes: Buffer.from(transaction.asset.delegate.username),
			assetSize: Buffer.from(transaction.asset.delegate.username).length
		}
	}

	function isVoteTransaction () {

		var voteTransactionBytes = (Buffer.from(transaction.asset.votes.join('')) || null);
		return {
			assetBytes: voteTransactionBytes,
			assetSize: (voteTransactionBytes.length || 0)
		}
	}

	function isMultisignatureTransaction () {

		var keysgroupBuffer = Buffer.from(transaction.asset.multisignature.keysgroup.join(''), 'utf8');
		var minimumMultisig = Buffer.alloc(transaction.asset.multisignature.min);
		var multisigLifetime = Buffer.alloc(transaction.asset.multisignature.lifetime);

		var multiSignatureBuffer = Buffer.concat([minimumMultisig, multisigLifetime, keysgroupBuffer]);

		return {
			assetBytes: multiSignatureBuffer,
			assetSize: multiSignatureBuffer.length

		}
	}

	function isDappTransaction () {

		var dapp = transaction.asset.dapp;
		var buf = new Buffer([]);
		var nameBuf = Buffer.from(dapp.name);
		buf = Buffer.concat([buf, nameBuf]);

		if (dapp.description) {
			var descriptionBuf = Buffer.from(dapp.description);
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (dapp.tags) {
			var tagsBuf = Buffer.from(dapp.tags);
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (dapp.link) {
			buf = Buffer.concat([buf, Buffer.from(dapp.link)]);
		}

		if (dapp.icon) {
			buf = Buffer.concat([buf, Buffer.from(dapp.icon)]);
		}

		var bb = new ByteBuffer(4 + 4, true);
		bb.writeInt(dapp.type);
		bb.writeInt(dapp.category);
		bb.flip();

		buf = Buffer.concat([buf, bb.toBuffer()]);

		return {
			assetBytes: buf,
			assetSize: buf.length
		}
	}

	function isDappTransferTransaction () {

		var arrayBuf = new Buffer([]);
		var dappBuffer = Buffer.from(transaction.asset.dapptransfer.dappid);
		arrayBuf = Buffer.concat([arrayBuf, dappBuffer]);

		return {
			assetBytes: arrayBuf,
			assetSize: arrayBuf.length
		}
	}

	var transactionType = {
		'0': isSendTransaction,
		'1': isSignatureTransaction,
		'2': isDelegateTransaction,
		'3': isVoteTransaction,
		'4': isMultisignatureTransaction,
		'5': isDappTransaction,
		'6': isDappTransferTransaction
	};

	return transactionType[transaction.type]();

}

/**
 * @method createTransactionBuffer
 * @param transaction Object
 * @return {buffer}
 */


function createTransactionBuffer (transaction) {

	function createEmptyTransactionBuffer (assetSize) {

		var typeSizes = {
			TRANSACTION_TYPE: 1,
			TIMESTAMP: 4,
			MULTISIGNATURE_PUBLICKEY: 32,
			RECIPIENT_ID: 8,
			AMOUNT: 8,
			SIGNATURE_TRANSACTION: 64,
			SECOND_SIGNATURE_TRANSACTION: 64
		};

		var totalBytes = 0;

		for (var key in typeSizes) {
			if (typeSizes.hasOwnProperty(key)) {
				totalBytes += typeSizes[key];
			}
		}

		return new ByteBuffer(totalBytes + assetSize, true);
	}

	function assignTransactionBuffer (transactionBuffer) {

		transactionBuffer.writeInt8(transaction.type);
		transactionBuffer.writeInt(transaction.timestamp);

		assignHexToTransactionBytes(transactionBuffer, transaction.senderPublicKey);

		if (transaction.requesterPublicKey) {
			assignHexToTransactionBytes(transactionBuffer, transaction.requesterPublicKey);
		}

		if (transaction.recipientId) {
			var recipient = transaction.recipientId.slice(0, -1);
			recipient = bignum(recipient).toBuffer({size: 8});

			for (var i = 0; i < 8; i++) {
				transactionBuffer.writeByte(recipient[i] || 0);
			}
		} else {
			for (var i = 0; i < 8; i++) {
				transactionBuffer.writeByte(0);
			}
		}

		transactionBuffer.writeLong(transaction.amount);

		if (assetSize > 0) {
			for (var i = 0; i < assetSize; i++) {
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
		var arrayBuffer = new Uint8Array(transactionBuffer.toArrayBuffer());
		var buffer = [];

		for (var i = 0; i < arrayBuffer.length; i++) {
			buffer[i] = arrayBuffer[i];
		}

		return Buffer.from(buffer);

	}

	function assignHexToTransactionBytes (partTransactionBuffer, hexValue) {
		var hexBuffer = Buffer.from(hexValue, 'hex');
		for (var i = 0; i < hexBuffer.length; i++) {
			partTransactionBuffer.writeByte(hexBuffer[i]);
		}
		return partTransactionBuffer;

	}

	//Get Transaction Size and Bytes
	var transactionAssetSizeBuffer = getTransactionBytes(transaction);
	var assetSize = transactionAssetSizeBuffer.assetSize;
	var assetBytes = transactionAssetSizeBuffer.assetBytes;

	var emptyTransactionBuffer = createEmptyTransactionBuffer(assetSize);
	var assignedTransactionBuffer = assignTransactionBuffer(emptyTransactionBuffer);

	return assignedTransactionBuffer;

}

/**
 * @method getBytes
 * @param transaction Object
 *
 * @return {buffer}
 */

function getBytes (transaction) {
	return createTransactionBuffer(transaction);
}

/**
 * @method getId
 * @param transaction Object
 *
 * @return {string}
 */

function getId (transaction) {
	var hash = crypto.createHash('sha256').update(getBytes(transaction).toString('hex'), 'hex').digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	var id = bignum.fromBuffer(temp).toString();
	return id;
}

/**
 * @method getHash
 * @param transaction Object
 *
 * @return {string}
 */

function getHash (transaction) {
	return crypto.createHash('sha256').update(getBytes(transaction)).digest();
}

/**
 * @method getFee
 * @param transaction Object
 *
 * @return {number}
 */

function getFee (transaction) {
	return constants.fee[transaction.type];
}

/**
 * @method sign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function sign (transaction, keys) {
	var hash = getHash(transaction);
	var signature = naclInstance.crypto_sign_detached(hash, new Buffer(keys.privateKey, 'hex'));

	if (!transaction.signature) {
		transaction.signature = new Buffer(signature).toString('hex');
	} else {
		return new Buffer(signature).toString('hex');
	}
}

/**
 * @method secondSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function secondSign (transaction, keys) {
	var hash = getHash(transaction);
	var signature = naclInstance.crypto_sign_detached(hash, new Buffer(keys.privateKey, 'hex'));
	transaction.signSignature = new Buffer(signature).toString('hex');
}

/**
 * @method multiSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function multiSign (transaction, keys) {
	var bytes = getBytes(transaction, true, true);
	var hash = crypto.createHash('sha256').update(bytes).digest();
	var signature = naclInstance.crypto_sign_detached(hash, new Buffer(keys.privateKey, 'hex'));

	return new Buffer(signature).toString('hex');
}

/**
 * @method verify
 * @param transaction Object
 *
 * @return {boolean}
 */

function verify (transaction) {
	var remove = 64;

	if (transaction.signSignature) {
		remove = 128;
	}

	var bytes = getBytes(transaction);
	var data2 = new Buffer(bytes.length - remove);

	for (var i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	var hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	var signatureBuffer = new Buffer(transaction.signature, 'hex');
	var senderPublicKeyBuffer = new Buffer(transaction.senderPublicKey, 'hex');
	var res = naclInstance.crypto_sign_verify_detached(signatureBuffer, hash, senderPublicKeyBuffer);

	return res;
}

/**
 * @method verifySecondSignature
 * @param transaction Object
 * @param publicKey Object
 *
 * @return {boolean}
 */

function verifySecondSignature (transaction, publicKey) {
	var bytes = getBytes(transaction);
	var data2 = new Buffer(bytes.length - 64);

	for (var i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	var hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	var signSignatureBuffer = new Buffer(transaction.signSignature, 'hex');
	var publicKeyBuffer = new Buffer(publicKey, 'hex');
	var res = naclInstance.crypto_sign_verify_detached(signSignatureBuffer, hash, publicKeyBuffer);

	return res;
}

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

function getKeys (secret) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = naclInstance.crypto_sign_keypair_from_seed(hash);

	return {
		publicKey : new Buffer(keypair.signPk).toString('hex'),
		privateKey : new Buffer(keypair.signSk).toString('hex')
	};
}

/**
 * @method getAddress
 * @param publicKey string
 *
 * @return {hex publicKey}
 */

function getAddress (publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey.toString('hex'), 'hex').digest();
	var temp = new Buffer(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';
	return address;
}

var cryptoModule = require('./crypto/index');

module.exports = {
	getBytes: getBytes,
	getHash: getHash,
	getId: getId,
	getFee: getFee,
	sign: sign,
	secondSign: secondSign,
	multiSign: multiSign,
	getKeys: getKeys,
	getAddress: getAddress,
	verify: verify,
	verifySecondSignature: verifySecondSignature,
	fixedPoint: fixedPoint,

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
};
