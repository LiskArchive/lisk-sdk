import convert from './convert';
import sign from './sign';
import keys from './keys';
import hash from './hash';

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
	getPrivateAndPublicKeyFromSecret: keys.getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: keys.getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: keys.getAddressFromPublicKey,
	getSha256Hash: hash.getSha256Hash,
	toAddress: convert.toAddress,
	signMessageWithTwoSecrets: sign.signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys: sign.verifyMessageWithTwoPublicKeys,
};
