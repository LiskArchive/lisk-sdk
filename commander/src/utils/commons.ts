/*
 * LiskHQ/lisk-commander
 * Copyright © 2021 Lisk Foundation
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
import * as cryptography from '@liskhq/lisk-cryptography';
import { NETWORK, RELEASE_URL } from '../constants';

export const liskSnapshotUrl = (url: string, network: NETWORK): string => {
	if (!['testnet', 'mainnet', 'betanet', 'default'].includes(network.toLowerCase())) {
		return '';
	}
	if (url && url.search(RELEASE_URL) >= 0) {
		return `${RELEASE_URL}/${network}/blockchain.db.tar.gz`;
	}
	return url;
};

export const encryptPassphrase = async (
	passphrase: string,
	password: string,
	outputPublicKey: boolean,
): Promise<Record<string, unknown>> => {
	const encryptedPassphrase = await cryptography.encrypt.encryptMessageWithPassword(
		passphrase,
		password,
	);

	return outputPublicKey
		? {
				encryptedPassphrase,
				publicKey: cryptography.legacy.getKeys(passphrase).publicKey.toString('hex'),
		  }
		: { encryptedPassphrase };
};

export const deriveKeypair = async (passphrase: string, keyDerivationPath: string) => {
	if (keyDerivationPath === 'legacy') {
		return cryptography.legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
	}
	const privateKey = await cryptography.ed.getKeyPairFromPhraseAndPath(
		passphrase,
		keyDerivationPath,
	);
	const publicKey = cryptography.ed.getPublicKeyFromPrivateKey(privateKey);
	return {
		publicKey,
		privateKey,
	};
};
