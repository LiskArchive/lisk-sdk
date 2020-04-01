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
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { randomInt, randomBigIntWithPowerof8 } from './random_int';
import * as delegatePublicKeys from '../fixtures/delegate_publickeys.json';
import { Account } from '../../src/types';

export { delegatePublicKeys };

export const getDelegateAccounts = (num: number = 1): Account[] => {
	const accounts = [];
	for (let index = 0; index < num; index += 1) {
		const { publicKey, address } = getAddressAndPublicKeyFromPassphrase(
			Mnemonic.generateMnemonic(),
		);
		const balance = String(randomInt(100, 1000));
		accounts.push({
			address,
			publicKey,
			producedBlocks: 0,
			missedBlocks: 0,
			balance: BigInt(balance),
			fees: BigInt('0'),
			rewards: BigInt('0'),
			voteWeight: BigInt('0'),
			totalVotesReceived: BigInt('0'),
			username: `genesis_${index + randomInt(0, 999999)}`,
			delegate: {
				isBanned: false,
				pomHeights: [],
			},
			votes: [],
			votedDelegatesPublicKeys: [],
		});
	}

	return accounts;
};

export const getDelegateAccountsWithVotesReceived = (
	num: number = 1,
): Account[] => {
	const accounts = getDelegateAccounts(num);
	for (const account of accounts) {
		account.totalVotesReceived = randomBigIntWithPowerof8(1000, 100000);
	}
	return accounts;
};
