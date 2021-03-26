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

export const createAccounts = (numberOfAccounts = 1) => {
	const accounts = new Array(numberOfAccounts).fill(0).map(createAccount);
	return accounts;
};

export const createFakeDefaultAccount = (account: any) => ({
	address: account?.address ?? getRandomBytes(20),
	token: {
		balance: account?.token?.balance ?? BigInt(0),
	},
	sequence: {
		nonce: account?.sequence?.nonce ?? BigInt(0),
	},
	keys: {
		mandatoryKeys: account?.keys?.mandatoryKeys ?? [],
		optionalKeys: account?.keys?.optionalKeys ?? [],
		numberOfSignatures: account?.keys?.numberOfSignatures ?? 0,
	},
	dpos: {
		delegate: {
			username: account?.dpos?.delegate?.username ?? '',
			pomHeights: account?.dpos?.delegate?.pomHeights ?? [],
			consecutiveMissedBlocks: account?.dpos?.delegate?.consecutiveMissedBlocks ?? 0,
			lastForgedHeight: account?.dpos?.delegate?.lastForgedHeight ?? 0,
			isBanned: account?.dpos?.delegate?.isBanned ?? false,
			totalVotesReceived: account?.dpos?.delegate?.totalVotesReceived ?? BigInt(0),
		},
		sentVotes: account?.dpos?.sentVotes ?? [],
		unlocking: account?.dpos?.unlocking ?? [],
	},
});
