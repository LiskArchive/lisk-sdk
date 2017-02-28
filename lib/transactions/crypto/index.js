var convert = require('./convert');
var sign = require('./sign');
var keys = require('./keys');
var hash = require('./hash');

module.exports = {

	bufferToHex: convert.bufferToHex,
	hexToBuffer: convert.hexToBuffer,
	useFirstEightBufferEntriesReversed: convert.useFirstEightBufferEntriesReversed,
	verifyMessageWithPublicKey: sign.verifyMessageWithPublicKey,
	signMessageWithSecret: sign.signMessageWithSecret,
	signAndPrintMessage: sign.signAndPrintMessage,
	printSignedMessage: sign.printSignedMessage,
	addLineBreak: sign.addLineBreak,
	getPrivateAndPublicKeyFromSecret: keys.getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: keys.getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: keys.getAddressFromPublicKey,
	getSha256Hash: hash.getSha256Hash

};