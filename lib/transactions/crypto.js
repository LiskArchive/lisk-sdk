/**
 * Crypto module provides functions for cryptographic functions in the Lisk Blockchain
 * @class crypto
 */

var crypto = require('crypto-browserify');
var constants = require('../constants.js');

if (typeof Buffer === 'undefined') {
	Buffer = require('buffer/').Buffer;
}

var ByteBuffer = require('bytebuffer');
var bignum = require('browserify-bignum');
var naclFactory = require('js-nacl');

var naclInstance;
naclFactory.instantiate(function (nacl) {
	naclInstance = nacl;
});

/**
 * `fixedPoint` is the size we calculate numbers in. 10^8
 * @property fixedPoint
 * @static
 * @final
 * @type Number
 */

var fixedPoint = Math.pow(10, 8);


/**
 * @method getSignatureBytes
 * @param signature
 * @return {typed array}
 */

function getSignatureBytes(signature) {
	var bb = new ByteBuffer(32, true);
	var publicKeyBuffer = new Buffer(signature.publicKey, 'hex');

	for (var i = 0; i < publicKeyBuffer.length; i++) {
		bb.writeByte(publicKeyBuffer[i]);
	}

	bb.flip();
	return new Uint8Array(bb.toArrayBuffer());
}

/**
 * @method getDAppBytes
 * @param dapp Object
 * @return {buffer}
 */

function getDAppBytes(dapp) {
	try {
		var buf = new Buffer([]);
		var nameBuf = new Buffer(dapp.name, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);

		if (dapp.description) {
			var descriptionBuf = new Buffer(dapp.description, 'utf8');
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (dapp.tags) {
			var tagsBuf = new Buffer(dapp.tags, 'utf8');
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (dapp.link) {
			buf = Buffer.concat([buf, new Buffer(dapp.link, 'utf8')]);
		}

		if (dapp.icon) {
			buf = Buffer.concat([buf, new Buffer(dapp.icon, 'utf8')]);
		}

		var bb = new ByteBuffer(4 + 4, true);
		bb.writeInt(dapp.type);
		bb.writeInt(dapp.category);
		bb.flip();

		buf = Buffer.concat([buf, bb.toBuffer()]);
	} catch (e) {
		throw Error(e.toString());
	}

	return buf;
}

/**
 * @method getTransferBytes
 * @param dapptransfer
 * @return {buffer}
 */

function getTransferBytes(dapptransfer) {
	try {
		var buf = new Buffer([]);
		var nameBuf = new Buffer(dapptransfer.dappid, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw Error(e.toString());
	}

	return buf;
}

/**
 * @method getBytes
 * @param transaction Object
 * @param skipSignature boolean
 * @param skipSecondSignature boolean
 *
 * @return {buffer}
 */

function getBytes(transaction, skipSignature, skipSecondSignature) {
	var assetSize = 0,
		assetBytes = null;

	switch (transaction.type) {
		case 1: // Signature
			assetSize = 32;
			assetBytes = getSignatureBytes(transaction.asset.signature);
			break;

		case 2: // Delegate
			assetBytes = new Buffer(transaction.asset.delegate.username, 'utf8');
			assetSize = assetBytes.length;
			break;

		case 3: // Vote
			if (transaction.asset.votes !== null) {
				assetBytes = new Buffer(transaction.asset.votes.join(''), 'utf8');
				assetSize = assetBytes.length;
			}
			break;

		case 4: // Multi-Signature
			var keysgroupBuffer = new Buffer(transaction.asset.multisignature.keysgroup.join(''), 'utf8');
			var bb = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);

			bb.writeByte(transaction.asset.multisignature.min);
			bb.writeByte(transaction.asset.multisignature.lifetime);

			for (var i = 0; i < keysgroupBuffer.length; i++) {
				bb.writeByte(keysgroupBuffer[i]);
			}

			bb.flip();

			assetBytes = bb.toBuffer();
			assetSize  = assetBytes.length;
			break;

		case 5: // Dapp
			assetBytes = getDAppBytes(transaction.asset.dapp);
			assetSize = assetBytes.length;
			break;

		case 6: // Dapp Transfer
			assetBytes = getTransferBytes(transaction.asset.dapptransfer);
			assetSize = assetBytes.length;
			break;
	}

	var bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize, true);

	bb.writeByte(transaction.type);
	bb.writeInt(transaction.timestamp);

	var senderPublicKeyBuffer = new Buffer(transaction.senderPublicKey, 'hex');
	for (var i = 0; i < senderPublicKeyBuffer.length; i++) {
		bb.writeByte(senderPublicKeyBuffer[i]);
	}

	if (transaction.requesterPublicKey) {
		var requesterPublicKey = new Buffer(transaction.requesterPublicKey, 'hex');

		for (var i = 0; i < requesterPublicKey.length; i++) {
			bb.writeByte(requesterPublicKey[i]);
		}
	}

	if (transaction.recipientId) {
		var recipient = transaction.recipientId.slice(0, -1);
		recipient = bignum(recipient).toBuffer({size: 8});

		for (var i = 0; i < 8; i++) {
			bb.writeByte(recipient[i] || 0);
		}
	} else {
		for (var i = 0; i < 8; i++) {
			bb.writeByte(0);
		}
	}

	bb.writeLong(transaction.amount);

	if (assetSize > 0) {
		for (var i = 0; i < assetSize; i++) {
			bb.writeByte(assetBytes[i]);
		}
	}

	if (!skipSignature && transaction.signature) {
		var signatureBuffer = new Buffer(transaction.signature, 'hex');
		for (var i = 0; i < signatureBuffer.length; i++) {
			bb.writeByte(signatureBuffer[i]);
		}
	}

	if (!skipSecondSignature && transaction.signSignature) {
		var signSignatureBuffer = new Buffer(transaction.signSignature, 'hex');
		for (var i = 0; i < signSignatureBuffer.length; i++) {
			bb.writeByte(signSignatureBuffer[i]);
		}
	}

	bb.flip();
	var arrayBuffer = new Uint8Array(bb.toArrayBuffer());
	var buffer = [];

	for (var i = 0; i < arrayBuffer.length; i++) {
		buffer[i] = arrayBuffer[i];
	}

	return new Buffer(buffer);
}

/**
 * @method getId
 * @param transaction Object
 *
 * @return {string}
 */


function getId(transaction) {
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

function getHash(transaction) {
	return crypto.createHash('sha256').update(getBytes(transaction)).digest();
}

/**
 * @method getFee
 * @param transaction Object
 *
 * @return {number}
 */

function getFee(transaction) {
	switch (transaction.type) {
		case 0: // Normal
			return constants.fees.send;
			break;

		case 1: // Signature
			return constants.fees.signature;
			break;

		case 2: // Delegate
			return constants.fees.delegate;
			break;

		case 3: // Vote
			return constants.fees.vote;
			break;

		case 4: // Multisignature
			return constants.fees.multisignature;
			break;

		case 5: // Dapp
			return constants.fees.dapp;
			break;
	}
}

/**
 * @method sign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function sign(transaction, keys) {
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

function secondSign(transaction, keys) {
	var hash = getHash(transaction);
	var signature = naclInstance.crypto_sign_detached(hash, new Buffer(keys.privateKey, 'hex'));
	transaction.signSignature = new Buffer(signature).toString('hex')
}

/**
 * @method multiSign
 * @param transaction Object
 * @param keys Object
 *
 * @return {string}
 */

function multiSign(transaction, keys) {
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

function verify(transaction) {
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

function verifySecondSignature(transaction, publicKey) {
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

function getKeys(secret) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = naclInstance.crypto_sign_keypair_from_seed(hash);

	return {
		publicKey : new Buffer(keypair.signPk).toString('hex'),
		privateKey : new Buffer(keypair.signSk).toString('hex')
	}
}

/**
 * @method getAddress
 * @param publicKey string
 *
 * @return {string}
 */

function getAddress(publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey.toString('hex'), 'hex').digest();
	var temp = new Buffer(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';
	return address;
}

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
	fixedPoint: fixedPoint
}
