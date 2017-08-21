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
import {
	bufferToHex,
	hexToBuffer,
	useFirstEightBufferEntriesReversed,
	getAddress,
	getId,
	toAddress,
} from './convert';
import {
	verifyMessageWithPublicKey,
	signMessageWithSecret,
	signAndPrintMessage,
	printSignedMessage,
	encryptMessageWithSecret,
	decryptMessageWithSecret,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys,
	sign,
	multiSign,
	verify,
	verifySecondSignature,
} from './sign';
import {
	getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey,
	getKeys,
} from './keys';
import {
	getSha256Hash,
	getHash,
} from './hash';

module.exports = {
	bufferToHex,
	hexToBuffer,
	useFirstEightBufferEntriesReversed,
	getAddress,
	getId,
	toAddress,
	verifyMessageWithPublicKey,
	signMessageWithSecret,
	signAndPrintMessage,
	printSignedMessage,
	encryptMessageWithSecret,
	decryptMessageWithSecret,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys,
	sign,
	multiSign,
	verify,
	verifySecondSignature,
	getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey,
	getKeys,
	getSha256Hash,
	getHash,
};
