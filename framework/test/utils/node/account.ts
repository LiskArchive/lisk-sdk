/*
 * Copyright © 2018 Lisk Foundation
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

import { Mnemonic } from '@liskhq/lisk-passphrase';
import { getKeys, getAddressFromPublicKey, getRandomBytes } from '@liskhq/lisk-cryptography';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccount = () => {
	const passphrase = Mnemonic.generateMnemonic();
	const { privateKey, publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccounts = (numberOfAccounts = 1) => {
	const accounts = new Array(numberOfAccounts).fill(0).map(createAccount);
	return accounts;
};

export const defaultAccount = (account: any) => ({
	address: account?.address ?? getRandomBytes(20),
	balance: account?.balance ?? BigInt(0),
	nonce: account?.nonce ?? BigInt(0),
	keys: {
		mandatoryKeys: account?.keys?.mandatoryKeys ?? [],
		optionalKeys: account?.keys?.optionalKeys ?? [],
		numberOfSignatures: account?.keys?.numberOfSignatures ?? 0,
	},
	asset: {
		delegate: {
			username: account?.asset?.delegate?.username ?? '',
			pomHeights: account?.asset?.delegate?.pomHeights ?? [],
			consecutiveMissedBlocks: account?.asset?.delegate?.consecutiveMissedBlocks ?? 0,
			lastForgedHeight: account?.asset?.delegate?.lastForgedHeight ?? 0,
			isBanned: account?.asset?.delegate?.isBanned ?? false,
			totalVotesReceived: account?.asset?.delegate?.totalVotesReceived ?? BigInt(0),
		},
		sentVotes: account?.asset?.sentVotes ?? [],
		unlocking: account?.asset?.unlocking ?? [],
	},
});
