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
import { codec } from '@liskhq/lisk-codec';
import { Account } from '../../src';
import { baseAccountSchema } from '../../src/schema';

export const genesisAccount = {
	address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
	publicKey: Buffer.from('0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a', 'hex'),
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};

export const defaultAccountAssetSchema = {
	delegate: {
		type: 'object',
		fieldNumber: 1,
		properties: {
			username: { dataType: 'string', fieldNumber: 1 },
			pomHeights: {
				type: 'array',
				items: { dataType: 'uint32' },
				fieldNumber: 2,
			},
			consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
			lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
			isBanned: { dataType: 'boolean', fieldNumber: 5 },
			totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
		},
		required: [
			'username',
			'pomHeights',
			'consecutiveMissedBlocks',
			'lastForgedHeight',
			'isBanned',
			'totalVotesReceived',
		],
	},
	sentVotes: {
		type: 'array',
		fieldNumber: 2,
		items: {
			type: 'object',
			properties: {
				delegateAddress: {
					dataType: 'bytes',
					fieldNumber: 1,
				},
				amount: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
			},
			required: ['delegateAddress', 'amount'],
		},
	},
	unlocking: {
		type: 'array',
		fieldNumber: 3,
		items: {
			type: 'object',
			properties: {
				delegateAddress: {
					dataType: 'bytes',
					fieldNumber: 1,
				},
				amount: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
				unvoteHeight: {
					dataType: 'uint32',
					fieldNumber: 3,
				},
			},
			required: ['delegateAddress', 'amount', 'unvoteHeight'],
		},
	},
};

export interface AccountAsset {
	delegate: DelegateAccountAsset;
	sentVotes: VoteAccountAsset[];
	unlocking: UnlockingAccountAsset[];
}

export interface DelegateAccountAsset {
	username: string;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	lastForgedHeight: number;
	isBanned: boolean;
	totalVotesReceived: bigint;
}

export interface VoteAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
}

export interface UnlockingAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
	unvoteHeight: number;
}

export const createFakeDefaultAccount = (
	account?: Partial<Account<AccountAsset>>,
): Account<AccountAsset> =>
	new Account<AccountAsset>({
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

export const defaultAccountSchema = {
	...baseAccountSchema,
	properties: {
		...baseAccountSchema.properties,
		asset: {
			...baseAccountSchema.properties.asset,
			properties: defaultAccountAssetSchema,
		},
	},
};

export const encodeDefaultAccount = (account: Account<any>): Buffer => {
	return codec.encode(defaultAccountSchema as any, { ...account });
};
