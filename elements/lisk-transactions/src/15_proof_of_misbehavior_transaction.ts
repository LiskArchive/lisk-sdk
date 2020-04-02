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
 *
 */
import {
	getAddressFromPublicKey,
	intToBuffer,
} from '@liskhq/lisk-cryptography';
import { isNumberString, validator } from '@liskhq/lisk-validator';

import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { convertToAssetError, TransactionError } from './errors';
import { Account, BlockHeader, TransactionJSON } from './transaction_types';
import { getBlockBytes } from './utils';

const proofOfMisbehaviorAssetFormatSchema = {
	type: 'object',
	required: ['header1', 'header2'],
	properties: {
		header1: {
			type: 'object',
			required: [
				'id',
				'version',
				'totalAmount',
				'seedReveal',
				'totalFee',
				'reward',
				'payloadHash',
				'timestamp',
				'numberOfTransactions',
				'payloadLength',
				'generatorPublicKey',
				'transactions',
				'blockSignature',
			],
			properties: {
				version: {
					type: 'integer',
					minimum: 0,
				},
				totalAmount: {
					type: 'string',
					format: 'amount',
				},
				totalFee: {
					type: 'string',
					format: 'amount',
				},
				reward: {
					type: 'string',
					format: 'amount',
				},
				seedReveal: {
					type: 'string',
					format: 'hex',
				},
				payloadHash: {
					type: 'string',
					format: 'hex',
				},
				timestamp: {
					type: 'integer',
					minimum: 0,
				},
				numberOfTransactions: {
					type: 'integer',
					minimum: 0,
				},
				payloadLength: {
					type: 'integer',
					minimum: 0,
				},
				previousBlockId: {
					type: ['null', 'string'],
					format: 'id',
					minLength: 1,
					maxLength: 20,
				},
				generatorPublicKey: {
					type: 'string',
					format: 'publicKey',
				},
				maxHeightPrevoted: {
					type: 'integer',
					minimum: 0,
				},
				maxHeightPreviouslyForged: {
					type: 'integer',
					minimum: 0,
				},
				height: {
					type: 'integer',
					minimum: 1,
				},
				blockSignature: {
					type: 'string',
					format: 'signature',
				},
				id: {
					type: 'string',
					format: 'id',
					minLength: 1,
					maxLength: 20,
				},
			},
		},
	},
};

export interface ProofOfMisbehaviorAsset {
	readonly header1: BlockHeader;
	readonly header2: BlockHeader;
}

export class ProofOfMisbehaviorTransaction extends BaseTransaction {
	public readonly asset: ProofOfMisbehaviorAsset;
	public static TYPE = 15;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset || {}) as ProofOfMisbehaviorAsset;
	}

	public assetToJSON(): object {
		return {
			header1: this.asset.header1,
			header2: this.asset.header2,
		};
	}

	protected assetToBytes(): Buffer {
		return Buffer.concat([
			getBlockBytes(this.asset.header1),
			getBlockBytes(this.asset.header1),
		]);
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		const delegateId = getAddressFromPublicKey(
			this.asset.header1.generatorPublicKey,
		);

		const filterArray = [
			{
				address: this.senderId,
			},
			{
				address: delegateId,
			},
		];

		await store.account.cache(filterArray);
	}
}
