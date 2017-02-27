var convert = require('./convert');
var keys = require('./keys');


function verifyMessageWithPublicKey (signedMessage, publicKey) {

	var publicKeyBytes = convert.hexToBuffer(publicKey);
	var signeMessageBytes = convert.hexToBuffer(signedMessage);

	var openSignature = naclInstance.crypto_sign_open(signeMessageBytes, publicKeyBytes);

	//returns original message
	return naclInstance.decode_utf8(openSignature);

}

function signMessageWithSecret (message, secret) {

	var keypair = keys.getRawPrivateAndPublicKeyFromSecret(secret);
	var msg = naclInstance.encode_utf8(message);
	var signedMessage = naclInstance.crypto_sign(msg, keypair.privateKey);
	var hexSignedMessage = convert.bufferToHex(signedMessage);

	return hexSignedMessage;
}


module.exports = {
	verifyMessageWithPublicKey: verifyMessageWithPublicKey,
	signMessageWithSecret: signMessageWithSecret
}