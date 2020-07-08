/*
 * Copyright © 2019 Lisk Foundation
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
 */

import { getRandomBytes } from '@liskhq/lisk-cryptography';

// Existing delegate account
export const existingDelegate = {
	address: '16936666638951007157L',
	publicKey: 'c0ebb5ae59f498718ac5038b6b83fd822b4d1def918c66c05f1709a418a5cf70',
	passphrase: 'slight wire team gravity finger soul reopen anchor evolve genius charge sing',
	balance: '0',
	delegateName: 'genesis_100',
};

// Genesis account, initially holding 100M total supply
export const genesis = {
	address: '5059876081639179984L',
	publicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createFakeDefaultAccount = (account?: any) => ({
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
