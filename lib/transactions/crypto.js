var crypto = require("crypto-browserify");

if (typeof Buffer === "undefined") {
	Buffer = require("buffer/").Buffer;
}

var ByteBuffer = require("bytebuffer");
var bignum = require("browserify-bignum");
var nacl_factory = require("js-nacl");
var nacl = nacl_factory.instantiate();

var fixedPoint = Math.pow(10, 8);

function getSignatureBytes(signature) {
	var bb = new ByteBuffer(32, true);
	var publicKeyBuffer = new Buffer(signature.publicKey, "hex");

	for (var i = 0; i < publicKeyBuffer.length; i++) {
		bb.writeByte(publicKeyBuffer[i]);
	}

	bb.flip();
	return new Uint8Array(bb.toArrayBuffer());
}

function getDAppBytes(dapp) {
	try {
		var buf = new Buffer([]);
		var nameBuf = new Buffer(dapp.name, "utf8");
		buf = Buffer.concat([buf, nameBuf]);

		if (dapp.description) {
			var descriptionBuf = new Buffer(dapp.description, "utf8");
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (dapp.tags) {
			var tagsBuf = new Buffer(dapp.tags, "utf8");
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (dapp.link) {
			buf = Buffer.concat([buf, new Buffer(dapp.link, "utf8")]);
		}

		if (dapp.icon) {
			buf = Buffer.concat([buf, new Buffer(dapp.icon, "utf8")]);
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

function getTransferBytes(dapptransfer) {
	try {
		var buf = new Buffer([]);
		var nameBuf = new Buffer(dapptransfer.dappid, "utf8");
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw Error(e.toString());
	}

	return buf;
}

function getBytes(transaction) {
	var assetSize = 0,
		assetBytes = null;

	switch (transaction.type) {
		case 1: // Signature
			assetSize = 32;
			assetBytes = getSignatureBytes(transaction.asset.signature);
			break;

		case 2: // Delegate
			assetBytes = new Buffer(transaction.asset.delegate.username, "utf8");
			assetSize = assetBytes.length;
			break;

		case 3: // Vote
			if (transaction.asset.votes !== null) {
				assetBytes = new Buffer(transaction.asset.votes.join(""), "utf8");
				assetSize = assetBytes.length;
			}
			break;

		case 4: // Multi-Signature
			var keysgroupBuffer = new Buffer(transaction.asset.multisignature.keysgroup.join(""), "utf8");
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

		case 6: // In Transfer (Dapp Deposit)
			assetBytes = getTransferBytes(transaction.asset.dapptransfer);
			assetSize = assetBytes.length;
			break;
	}

	if (transaction.requesterPublicKey) {
		assetSize += 32;
	}

	var bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize, true);
	bb.writeByte(transaction.type);
	bb.writeInt(transaction.timestamp);

	var senderPublicKeyBuffer = new Buffer(transaction.senderPublicKey, "hex");
	for (var i = 0; i < senderPublicKeyBuffer.length; i++) {
		bb.writeByte(senderPublicKeyBuffer[i]);
	}

	if (transaction.requesterPublicKey) {
		var requesterPublicKey = new Buffer(transaction.requesterPublicKey, "hex");

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

	if (transaction.signature) {
		var signatureBuffer = new Buffer(transaction.signature, "hex");
		for (var i = 0; i < signatureBuffer.length; i++) {
			bb.writeByte(signatureBuffer[i]);
		}
	}

	if (transaction.signSignature) {
		var signSignatureBuffer = new Buffer(transaction.signSignature, "hex");
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

function getId(transaction) {
	var hash = crypto.createHash("sha256").update(getBytes(transaction).toString("hex"), "hex").digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	var id = bignum.fromBuffer(temp).toString();
	return id;
}

function getHash(transaction) {
	return crypto.createHash("sha256").update(getBytes(transaction)).digest();
}

function getFee(transaction) {
	switch (transaction.type) {
		case 0: // Normal
			return 0.1 * fixedPoint;
			break;

		case 1: // Signature
			return 100 * fixedPoint;
			break;

		case 2: // Delegate
			return 10000 * fixedPoint;
			break;

		case 3: // Vote
			return 1 * fixedPoint;
			break;
	}
}

function sign(transaction, keys) {
	var hash = getHash(transaction);
	var signature = nacl.crypto_sign_detached(hash, new Buffer(keys.privateKey, "hex"));

	if (!transaction.signature) {
		transaction.signature = new Buffer(signature).toString("hex");
	} else {
		return new Buffer(signature).toString("hex");
	}
}

function secondSign(transaction, keys) {
	var hash = getHash(transaction);
	var signature = nacl.crypto_sign_detached(hash, new Buffer(keys.privateKey, "hex"));
	transaction.signSignature = new Buffer(signature).toString("hex")
}

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

	var hash = crypto.createHash("sha256").update(data2.toString("hex"), "hex").digest();

	var signatureBuffer = new Buffer(transaction.signature, "hex");
	var senderPublicKeyBuffer = new Buffer(transaction.senderPublicKey, "hex");
	var res = nacl.crypto_sign_verify_detached(signatureBuffer, hash, senderPublicKeyBuffer);

	return res;
}

function verifySecondSignature(transaction, publicKey) {
	var bytes = getBytes(transaction);
	var data2 = new Buffer(bytes.length - 64);

	for (var i = 0; i < data2.length; i++) {
		data2[i] = bytes[i];
	}

	var hash = crypto.createHash("sha256").update(data2.toString("hex"), "hex").digest();

	var signSignatureBuffer = new Buffer(transaction.signSignature, "hex");
	var publicKeyBuffer = new Buffer(publicKey, "hex");
	var res = nacl.crypto_sign_verify_detached(signSignatureBuffer, hash, publicKeyBuffer);

	return res;
}

function getKeys(secret) {
	var hash = crypto.createHash("sha256").update(secret, "utf8").digest();
	var keypair = nacl.crypto_sign_keypair_from_seed(hash);

	return {
		publicKey : new Buffer(keypair.signPk).toString("hex"),
		privateKey : new Buffer(keypair.signSk).toString("hex")
	}
}

function getAddress(publicKey) {
	var publicKeyHash = crypto.createHash("sha256").update(publicKey.toString("hex"), "hex").digest();
	var temp = new Buffer(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + "L";
	return address;
}

module.exports = {
	getBytes : getBytes,
	getHash : getHash,
	getId : getId,
	getFee : getFee,
	sign : sign,
	secondSign : secondSign,
	getKeys : getKeys,
	getAddress : getAddress,
	verify : verify,
	verifySecondSignature : verifySecondSignature,
	fixedPoint : fixedPoint
}
