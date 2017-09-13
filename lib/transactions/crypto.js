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

	/**
	 * @method isSendTransaction
	 * @return {object}
	 */

	function isSendTransaction () {
		return {
			assetBytes: null,
			assetSize: 0
		};
	}

	/**
	 * @method isSignatureTransaction
	 * @return {object}
	 */

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

	/**
	 * @method isDelegateTransaction
	 * @return {object}
	 */

	function isDelegateTransaction () {
		return {
			assetBytes: Buffer.from(transaction.asset.delegate.username),
			assetSize: Buffer.from(transaction.asset.delegate.username).length
		};
	}

	/**
	 * @method isVoteTransaction
	 * @return {object}
	 */

	function isVoteTransaction () {
		var voteTransactionBytes = (Buffer.from(transaction.asset.votes.join('')) || null);

		return {
			assetBytes: voteTransactionBytes,
			assetSize: (voteTransactionBytes.length || 0)
		};
	}

	/**
	 * @method isMultisignatureTransaction
	 * @return {object}
	 */

	function isMultisignatureTransaction () {
		var MINSIGNATURES = 1;
		var LIFETIME = 1;
		var keysgroupBuffer = Buffer.from(transaction.asset.multisignature.keysgroup.join(''), 'utf8');

		var bb = new ByteBuffer(MINSIGNATURES + LIFETIME + keysgroupBuffer.length, true);
		bb.writeByte(transaction.asset.multisignature.min);
		bb.writeByte(transaction.asset.multisignature.lifetime);
		for (var i = 0; i < keysgroupBuffer.length; i++) {
			bb.writeByte(keysgroupBuffer[i]);
		}
		bb.flip();

		bb.toBuffer();
		var multiSigBuffer = new Uint8Array(bb.toArrayBuffer());

		return {
			assetBytes: multiSigBuffer,
			assetSize: multiSigBuffer.length
		};
	}

	/**
	 * @method isDappTransaction
	 * @return {object}
	 */

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
		};
	}

	/**
	 * @method isDappInTransferTransaction
	 * @return {object}
	 */

	function isDappInTransferTransaction () {
		var buf = Buffer.from(transaction.asset.inTransfer.dappId);

		return {
			assetBytes: buf,
			assetSize: buf.length
		};
	}

	/**
	 * @method isDappOutTransferTransaction
	 * @return {object}
	 */

	function isDappOutTransferTransaction () {
		var dappBuf = Buffer.from(transaction.asset.outTransfer.dappId);
		var transactionBuf = Buffer.from(transaction.asset.outTransfer.transactionId);
		var buf = Buffer.concat([dappBuf, transactionBuf]);

		return {
			assetBytes: buf,
			assetSize: buf.length
		};
	}

	/**
	 * `transactionType` describes the available transaction types.
	 *
	 * @property transactionType
	 * @type object
	 */

	var transactionType = {
		'0': isSendTransaction,
		'1': isSignatureTransaction,
		'2': isDelegateTransaction,
		'3': isVoteTransaction,
		'4': isMultisignatureTransaction,
		'5': isDappTransaction,
		'6': isDappInTransferTransaction,
		'7': isDappOutTransferTransaction,
	};

	return transactionType[transaction.type]();
}

/**
 * @method createTransactionBuffer
 * @param transaction Object
 * @param options String
 * @return {buffer}
 */

function createTransactionBuffer (transaction, options) {
	function assignHexToTransactionBytes (partTransactionBuffer, hexValue) {
		var hexBuffer = Buffer.from(hexValue, 'hex');
		for (var i = 0; i < hexBuffer.length; i++) {
			partTransactionBuffer.writeByte(hexBuffer[i]);
		}
		return partTransactionBuffer;

	}

	/**
	 * @method createEmptyTransactionBuffer
	 * @param assetSize number
	 * @return {buffer}
	 */

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

	/**
	 * @method assignTransactionBuffer
	 * @param transactionBuffer buffer
	 * @param assetSize number
	 * @param assetBytes number
	 * @return {buffer}
	 */

	function assignTransactionBuffer (transactionBuffer, assetSize, assetBytes) {
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

		if(options !== 'multisignature') {
			if (transaction.signature) {
				assignHexToTransactionBytes(transactionBuffer, transaction.signature);
			}

			if (transaction.signSignature) {
				assignHexToTransactionBytes(transactionBuffer, transaction.signSignature);
			}
		}

		transactionBuffer.flip();
		var arrayBuffer = new Uint8Array(transactionBuffer.toArrayBuffer());
		var buffer = [];

		for (var i = 0; i < arrayBuffer.length; i++) {
			buffer[i] = arrayBuffer[i];
		}

		return Buffer.from(buffer);
	}

	// Get Transaction Size and Bytes
	var transactionAssetSizeBuffer = getTransactionBytes(transaction);
	var assetSize = transactionAssetSizeBuffer.assetSize;
	var assetBytes = transactionAssetSizeBuffer.assetBytes;

	var emptyTransactionBuffer = createEmptyTransactionBuffer(assetSize);
	var assignedTransactionBuffer = assignTransactionBuffer(emptyTransactionBuffer, assetSize, assetBytes);

	return assignedTransactionBuffer;
}

/**
 * @method getBytes
 * @param transaction Object
 *
 * @return {buffer}
 */

function getBytes (transaction, options) {
	return createTransactionBuffer(transaction, options);
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
	var bytes = getBytes(transaction);
	return crypto.createHash('sha256').update(bytes).digest();
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
	var signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));

	if (!transaction.signature) {
		transaction.signature = Buffer.from(signature).toString('hex');
	} else {
		return Buffer.from(signature).toString('hex');
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
	var signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));
	transaction.signSignature = Buffer.from(signature).toString('hex');
}

/**
 * @method multiSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function multiSign (transaction, keys) {
	var bytes = getBytes(transaction, 'multisignature');
	var hash = crypto.createHash('sha256').update(bytes).digest();
	var signature = naclInstance.crypto_sign_detached(hash, Buffer.from(keys.privateKey, 'hex'));

	return Buffer.from(signature).toString('hex');
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
	var data2 = Buffer.alloc(bytes.length - remove);

	for (var i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	var hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	var signatureBuffer = Buffer.from(transaction.signature, 'hex');
	var senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
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
	var data2 = Buffer.alloc(bytes.length - 64);

	for (var i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	var hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	var signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
	var publicKeyBuffer = Buffer.from(publicKey, 'hex');
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
		publicKey : Buffer.from(keypair.signPk).toString('hex'),
		privateKey : Buffer.from(keypair.signSk).toString('hex')
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
	var temp = Buffer.alloc(8);

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
	decryptPassphraseWithPassword: cryptoModule.decryptPassphraseWithPassword,
	encryptPassphraseWithPassword: cryptoModule.encryptPassphraseWithPassword,
};
