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
import { cryptography } from 'lisk-sdk';
import { NETWORK, RELEASE_URL } from '../constants';

export const liskSnapshotUrl = (url: string, network: NETWORK): string => {
	if (!['testnet', 'mainnet', 'betanet'].includes(network.toLowerCase())) {
		return '';
	}
	if (url && url.search(RELEASE_URL) >= 0) {
		return `${RELEASE_URL}/${network}/blockchain.db.tar.gz`;
	}
	return url;
};

export const encryptPassphrase = (
	passphrase: string,
	password: string,
	outputPublicKey: boolean,
): Record<string, unknown> => {
	const encryptedPassphraseObject = cryptography.encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = cryptography.stringifyEncryptedPassphrase(encryptedPassphraseObject);

	return outputPublicKey
		? {
				encryptedPassphrase,
				publicKey: cryptography.getKeys(passphrase).publicKey.toString('hex'),
		  }
		: { encryptedPassphrase };
};
