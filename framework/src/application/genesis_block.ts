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

// TODO: Remove this file completely after #5234

import { Block } from '@liskhq/lisk-chain';
import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
} from '@liskhq/lisk-transactions';

interface Payload {
	id: string;
	senderPublicKey: string;
	nonce: string;
	fee: string;
	signatures: string[];
}

interface TransferPayload extends Payload {
	type: 8;
	asset: {
		recipientAddress: string;
		amount: string;
	};
}

interface DelegatePayload extends Payload {
	type: 10;
	asset: {
		username: string;
	};
}

interface VotePayload extends Payload {
	type: 13;
	asset: {
		votes: {
			delegateAddress: string;
			amount: string;
		}[];
	};
}

export interface GenesisBlockJSON {
	readonly communityIdentifier: string;
	readonly header: {
		readonly id: string;
		readonly version: number;
		readonly timestamp: number;
		readonly height: number;
		readonly previousBlockID: string;
		readonly transactionRoot: string;
		readonly generatorPublicKey: string;
		readonly reward: string;
		readonly asset: {
			seedReveal: string;
			maxHeightPreviouslyForged: number;
			maxHeightPrevoted: number;
		};
		readonly signature: string;
	};
	readonly payload: Array<TransferPayload | DelegatePayload | VotePayload>;
}

export const convertGenesisBlock = (genesis: GenesisBlockJSON): Block => {
	const header = {
		...genesis.header,
		id: Buffer.from(genesis.header.id, 'base64'),
		previousBlockID: Buffer.alloc(0),
		generatorPublicKey: Buffer.from(
			genesis.header.generatorPublicKey,
			'base64',
		),
		transactionRoot: Buffer.from(genesis.header.transactionRoot, 'base64'),
		reward: BigInt(genesis.header.reward),
		signature: Buffer.from(genesis.header.signature, 'base64'),
		asset: {
			...genesis.header.asset,
			seedReveal: Buffer.from(genesis.header.asset.seedReveal, 'base64'),
		},
	};
	const payload = genesis.payload.map(tx => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const txHeader = {
			id: Buffer.from(tx.id, 'base64'),
			type: tx.type,
			senderPublicKey: Buffer.from(tx.senderPublicKey, 'base64'),
			nonce: BigInt(tx.nonce),
			fee: BigInt(tx.fee),
			signatures: tx.signatures.map(s => Buffer.from(s, 'base64')),
		};
		if (tx.type === 8) {
			return new TransferTransaction({
				...txHeader,
				asset: {
					recipientAddress: Buffer.from(tx.asset.recipientAddress, 'base64'),
					data: '',
					amount: BigInt(tx.asset.amount),
				},
			});
		}
		if (tx.type === 10) {
			return new DelegateTransaction({
				...txHeader,
				asset: {
					username: tx.asset.username,
				},
			});
		}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (tx.type === 13) {
			return new VoteTransaction({
				...txHeader,
				asset: {
					votes: tx.asset.votes.map(v => ({
						delegateAddress: Buffer.from(v.delegateAddress, 'base64'),
						amount: BigInt(v.amount),
					})),
				},
			});
		}
		throw new Error('Unexpected payload type');
	});

	return {
		header,
		payload,
	};
};
