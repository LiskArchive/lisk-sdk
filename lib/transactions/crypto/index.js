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
	encryptMessageWithSecret: sign.encryptMessageWithSecret,
	decryptMessageWithSecret: sign.decryptMessageWithSecret,
	convertPublicKeyEd2Curve: sign.convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve: sign.convertPrivateKeyEd2Curve,
	decryptPassphraseWithPassword: sign.decryptPassphraseWithPassword,
	encryptPassphraseWithPassword: sign.encryptPassphraseWithPassword,
	getPrivateAndPublicKeyFromSecret: keys.getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: keys.getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: keys.getAddressFromPublicKey,
	getSha256Hash: hash.getSha256Hash,
};
