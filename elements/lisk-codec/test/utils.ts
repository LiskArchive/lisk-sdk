/*
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
 */

export const buildTestCases = <
	T extends { title?: string; description: string } | { title: string; description?: string },
>(
	testCases: T[],
): T[] =>
	testCases.map(t => ({
		...t,
		toString: () => t.title ?? t.description,
	}));

export const getAccountFromJSON = (account: any) => ({
	...account,
	address: Buffer.from(account.address, 'hex'),
	balance: BigInt(account.balance),
	publicKey: Buffer.from(account.publicKey, 'hex'),
	nonce: BigInt(account.nonce),
	keys: {
		...account.keys,
		mandatoryKeys: account.keys.mandatoryKeys.map((b: string) => Buffer.from(b, 'hex')),
		optionalKeys: account.keys.optionalKeys.map((b: any) => Buffer.from(b.data, 'hex')),
	},
	asset: {
		...account.asset,
		validator: {
			...account.asset.validator,
			totalStakeReceived: BigInt(account.asset.validator.totalStakeReceived),
		},
		sentStakes: account.asset.sentStakes.map((v: any) => ({
			...v,
			validatorAddress: Buffer.from(v.validatorAddress, 'hex'),
			amount: BigInt(v.amount),
		})),
		unlocking: account.asset.unlocking.map((v: any) => ({
			...v,
			validatorAddress: Buffer.from(v.validatorAddress, 'hex'),
			amount: BigInt(v.amount),
		})),
	},
});
