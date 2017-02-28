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

var convert = require('./convert');
var keys = require('./keys');


function verifyMessageWithPublicKey (signedMessage, publicKey) {

	var signedMessageBytes = convert.hexToBuffer(signedMessage);
	var publicKeyBytes = convert.hexToBuffer(publicKey);

	var openSignature = naclInstance.crypto_sign_open(signedMessageBytes, publicKeyBytes);

	console.log(openSignature);
	if(openSignature === null || openSignature === undefined) {
		throw new Error('The public key does not match the signed message.');
	}

	//returns original message
	return naclInstance.decode_utf8(openSignature);

}

function signMessageWithSecret (message, secret) {

	var msg = naclInstance.encode_utf8(message);
	var keypair = keys.getRawPrivateAndPublicKeyFromSecret(secret);

	var signedMessage = naclInstance.crypto_sign(msg, keypair.privateKey);
	var hexSignedMessage = convert.bufferToHex(signedMessage);

	return hexSignedMessage;
}


module.exports = {
	verifyMessageWithPublicKey: verifyMessageWithPublicKey,
	signMessageWithSecret: signMessageWithSecret
}