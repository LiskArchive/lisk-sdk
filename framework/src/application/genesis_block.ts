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

// TODO: Remove this file completely after #5354
//  Add JSON decode and encode for the lisk-codec

import { GenesisAccountState, GenesisBlock } from '@liskhq/lisk-genesis';
import { AccountAsset } from './node/account';

export interface GenesisBlockJSON {
	header: {
		readonly id: string;
		readonly version: number;
		readonly timestamp: number;
		readonly height: number;
		readonly previousBlockID: string;
		readonly transactionRoot: string;
		readonly generatorPublicKey: string;
		readonly reward: string;
		readonly signature: string;
		readonly asset: {
			readonly accounts: GenesisAccountStateJSON[];
			readonly initDelegates: string[];
			readonly initRounds: number;
		};
	};
	payload: never[];
}

export interface GenesisAccountStateJSON {
	readonly address: string;
	readonly balance: string;
	readonly publicKey: string;
	readonly nonce: string;
	readonly keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
		numberOfSignatures: number;
	};
	readonly asset: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: string;
		};
		sentVotes: { delegateAddress: string; amount: string }[];
		unlocking: {
			delegateAddress: string;
			amount: string;
			unvoteHeight: number;
		}[];
	};
}

const accountFromJSON = (
	account: GenesisAccountStateJSON,
): GenesisAccountState<AccountAsset> => ({
	address: Buffer.from(account.address, 'base64'),
	balance: BigInt(account.balance),
	publicKey: Buffer.from(account.publicKey, 'base64'),
	nonce: BigInt(account.nonce),
	keys: {
		mandatoryKeys: account.keys.mandatoryKeys.map(key =>
			Buffer.from(key, 'base64'),
		),
		optionalKeys: account.keys.optionalKeys.map(key =>
			Buffer.from(key, 'base64'),
		),
		numberOfSignatures: account.keys.numberOfSignatures,
	},
	asset: {
		delegate: {
			...account.asset.delegate,
			totalVotesReceived: BigInt(account.asset.delegate.totalVotesReceived),
		},
		sentVotes: account.asset.sentVotes.map(vote => ({
			delegateAddress: Buffer.from(vote.delegateAddress, 'base64'),
			amount: BigInt(vote.amount),
		})),
		unlocking: account.asset.unlocking.map(unlock => ({
			delegateAddress: Buffer.from(unlock.delegateAddress, 'base64'),
			amount: BigInt(unlock.amount),
			unvoteHeight: unlock.unvoteHeight,
		})),
	},
});

export const genesisBlockFromJSON = (
	genesis: GenesisBlockJSON,
): GenesisBlock<AccountAsset> => {
	const header = {
		...genesis.header,
		id: Buffer.from(genesis.header.id, 'base64'),
		previousBlockID: Buffer.from(genesis.header.previousBlockID, 'base64'),
		transactionRoot: Buffer.from(genesis.header.transactionRoot, 'base64'),
		generatorPublicKey: Buffer.from(
			genesis.header.generatorPublicKey,
			'base64',
		),
		reward: BigInt(genesis.header.reward),
		signature: Buffer.from(genesis.header.signature, 'base64'),
		asset: {
			initRounds: genesis.header.asset.initRounds,
			initDelegates: genesis.header.asset.initDelegates.map(address =>
				Buffer.from(address, 'base64'),
			),
			accounts: genesis.header.asset.accounts.map(accountFromJSON),
		},
	};

	return {
		header,
		payload: [],
	};
};
