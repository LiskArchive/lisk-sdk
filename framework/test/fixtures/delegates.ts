/*
 * Copyright © 2020 Lisk Foundation
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

import { dataStructures } from '@liskhq/lisk-utils';
import { Account } from '@liskhq/lisk-chain';
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { DPOSAccountProps } from '../../src/modules/dpos';

export const randomInt = (low: number, high: number): number => {
	return Math.round(Math.random() * (high - low) + low);
};

export const randomBigIntWithPowerof8 = (low: number, high: number): bigint => {
	const random = randomInt(low, high);
	return BigInt(random) * BigInt(10) ** BigInt(8);
};

export interface DelegateAccountsWithPublicKeysMap {
	readonly accounts: Account<DPOSAccountProps>[];
	readonly publicKeyMap: dataStructures.BufferMap<Buffer>;
}

export const getDelegateAccounts = (num = 1): DelegateAccountsWithPublicKeysMap => {
	const accounts = [];
	const publicKeyMap = new dataStructures.BufferMap<Buffer>();
	for (let index = 0; index < num; index += 1) {
		const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(
			Mnemonic.generateMnemonic(),
		);
		publicKeyMap.set(address, publicKey);
		accounts.push({
			address,
			dpos: {
				delegate: {
					totalVotesReceived: BigInt('0'),
					username: `genesis_${(index + randomInt(0, 999999)).toString()}`,
					isBanned: false,
					consecutiveMissedBlocks: 0,
					lastForgedHeight: 0,
					pomHeights: [],
				},
				sentVotes: [],
				unlocking: [],
			},
		});
	}

	return { accounts, publicKeyMap };
};

export const getDelegateAccountsWithVotesReceived = (
	num = 1,
): DelegateAccountsWithPublicKeysMap => {
	const { accounts, publicKeyMap } = getDelegateAccounts(num);
	for (const account of accounts) {
		account.dpos.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 100000);
	}
	return { accounts, publicKeyMap };
};
