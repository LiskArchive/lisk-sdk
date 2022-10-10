/*
 * Copyright © 2022 Lisk Foundation
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

import { passphrase, cryptography } from 'lisk-sdk';

export const createAccount = async () => {
	const accountKeyPath = "m/44'/134'/0'";
	const generatorKeyPath = "m/25519'/134'/0'/0'";
	const blsKeyPath = 'm/12381/134/0/0';
	const mnemonicPassphrase = passphrase.Mnemonic.generateMnemonic(256);
	const privateKey = await cryptography.ed.getPrivateKeyFromPhraseAndPath(
		mnemonicPassphrase,
		accountKeyPath,
	);
	const publicKey = cryptography.ed.getPublicKeyFromPrivateKey(privateKey);

	const address = cryptography.address.getLisk32AddressFromPublicKey(publicKey);

	const generatorPrivateKey = await cryptography.ed.getPrivateKeyFromPhraseAndPath(
		mnemonicPassphrase,
		generatorKeyPath,
	);
	const generatorKey = cryptography.ed.getPublicKeyFromPrivateKey(privateKey);

	const blsPrivateKey = await cryptography.bls.getPrivateKeyFromPhraseAndPath(
		mnemonicPassphrase,
		blsKeyPath,
	);
	const blsKey = cryptography.bls.getPublicKeyFromPrivateKey(blsPrivateKey);
	const blsProofOfPosession = cryptography.bls.popProve(blsPrivateKey);

	return {
		passphrase: mnemonicPassphrase,
		address,
		privateKey,
		publicKey,
		generatorPrivateKey,
		generatorKey,
		blsPrivateKey,
		blsKey,
		blsProofOfPosession,
	};
};
