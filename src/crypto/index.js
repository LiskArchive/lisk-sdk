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
import convert from './convert';
import sign from './sign';
import keys from './keys';
import hash from './hash';

module.exports = {
	bufferToHex: convert.bufferToHex,
	hexToBuffer: convert.hexToBuffer,
	useFirstEightBufferEntriesReversed: convert.useFirstEightBufferEntriesReversed,
	getAddress: convert.getAddress,
	getId: convert.getId,
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
	getKeys: keys.getKeys,
	getSha256Hash: hash.getSha256Hash,
	getHash: hash.getHash,
	toAddress: convert.toAddress,
	signMessageWithTwoSecrets: sign.signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys: sign.verifyMessageWithTwoPublicKeys,
};
