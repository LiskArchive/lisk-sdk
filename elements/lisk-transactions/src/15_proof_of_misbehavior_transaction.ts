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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

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

	public assetToJSON(): ProofOfMisbehaviorAsset {
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

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const asset = this.assetToJSON();
		const schemaErrors = validator.validate(
			proofOfMisbehaviorAssetFormatSchema,
			asset,
		);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		if (
			this.asset.header1.generatorPublicKey !==
			this.asset.header2.generatorPublicKey
		) {
			errors.push(
				new TransactionError(
					'GeneratorPublickey of each blockheader must be matching.',
					this.id,
					'.asset.header1',
				),
			);
		}

		if (this.asset.header1.id === this.asset.header2.id) {
			errors.push(
				new TransactionError(
					'Blockheader ids are the same. No contradiction detected.',
					this.id,
					'.asset.header1',
				),
			);
		}

		/*
            Check for BFT violations:
                1. Double forging
                2. Disjointness 
                3. Branch is not the one with largest maxHeighPrevoted
        */

		// tslint:disable-next-line no-let
		let b1 = asset.header1;
		// tslint:disable-next-line no-let
		let b2 = asset.header2;

		// Order the two block headers such that b1 must be forged first
		if (
			b1.maxHeightPreviouslyForged > b2.maxHeightPreviouslyForged ||
			(b1.maxHeightPreviouslyForged === b2.maxHeightPreviouslyForged &&
				b1.maxHeightPrevoted > b2.maxHeightPrevoted) ||
			(b1.maxHeightPreviouslyForged === b2.maxHeightPreviouslyForged &&
				b1.maxHeightPrevoted === b2.maxHeightPrevoted &&
				b1.height > b2.height)
		) {
			b1 = asset.header2;
			b2 = asset.header1;
		}

		if (
			!(
				b1.maxHeightPrevoted === b2.maxHeightPrevoted && b1.height >= b2.height
			) &&
			!(b1.height > b2.maxHeightPreviouslyForged) &&
			!(b1.maxHeightPrevoted > b2.maxHeightPrevoted)
		) {
			errors.push(
				new TransactionError(
					'Blockheaders are not contradicting as per BFT violation rules.',
					this.id,
					'.asset.header1',
				),
			);
		}

		return errors;
	}
}
