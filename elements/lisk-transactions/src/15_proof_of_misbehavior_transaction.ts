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
import { isNumberString, validator } from '@liskhq/lisk-validator';

import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { MAX_BLOCK_HEIGHT_DIFFERENCE, MAX_POM_HEIGHTS } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { BlockHeader, TransactionJSON } from './transaction_types';
import {
	getBlockBytes,
	getBlockBytesWithSignature,
	isPunished,
	validateSignature,
} from './utils';

const blockHeaderSchema = {
	type: 'object',
	required: [
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
			type: ['string'],
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
	},
};

const proofOfMisbehaviorAssetFormatSchema = {
	type: 'object',
	required: ['header1', 'header2'],
	properties: {
		header1: blockHeaderSchema,
		header2: blockHeaderSchema,
	},
};
export interface ProofOfMisbehaviorAsset {
	readonly header1: BlockHeader;
	readonly header2: BlockHeader;
	// tslint:disable-next-line readonly-keyword
	reward?: bigint;
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
		this.asset.reward =
			this.asset.reward && isNumberString(this.asset.reward)
				? BigInt(this.asset.reward)
				: BigInt(0);
	}

	public assetToJSON(): ProofOfMisbehaviorAsset {
		return {
			header1: this.asset.header1,
			header2: this.asset.header2,
		};
	}

	protected assetToBytes(): Buffer {
		return Buffer.concat([
			getBlockBytesWithSignature(this.asset.header1),
			getBlockBytesWithSignature(this.asset.header1),
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
					'GeneratorPublickey of each blockheader should match.',
					this.id,
					'.asset.header1',
				),
			);
		}

		if (
			Buffer.compare(
				getBlockBytes(this.asset.header1),
				getBlockBytes(this.asset.header2),
			) === 0
		) {
			errors.push(
				new TransactionError(
					'Blockheaders are identical. No contradiction detected.',
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

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors = [];
		const currentHeight = store.chain.lastBlockHeader.height + 1;
		const senderAccount = await store.account.get(this.senderId);
		const { networkIdentifier } = store.chain;
		/*
			|header1.height - h| < 260,000.
			|header2.height - h| < 260,000.
		*/

		// tslint:disable-next-line no-magic-numbers
		if (
			Math.abs(this.asset.header1.height - currentHeight) >=
			MAX_BLOCK_HEIGHT_DIFFERENCE
		) {
			errors.push(
				new TransactionError(
					`Difference between header1.height and current height must be less than ${MAX_BLOCK_HEIGHT_DIFFERENCE}.`,
					this.id,
					'.asset.header1',
					this.asset.header1.height,
				),
			);
		}

		// tslint:disable-next-line no-magic-numbers
		if (
			Math.abs(this.asset.header2.height - currentHeight) >=
			MAX_BLOCK_HEIGHT_DIFFERENCE
		) {
			errors.push(
				new TransactionError(
					`Difference between header2.height and current height must be less than ${MAX_BLOCK_HEIGHT_DIFFERENCE}.`,
					this.id,
					'.asset.header2',
					this.asset.header2.height,
				),
			);
		}

		/*
			Check if delegate is eligible to be punished
		*/
		const delegateAccount = await store.account.get(delegateId);

		if (!delegateAccount.isDelegate || !delegateAccount.username) {
			errors.push(
				new TransactionError(
					'Account is not a delegate',
					this.id,
					'.asset.header1.generatorPublicKey',
				),
			);
		}

		if (delegateAccount.delegate.isBanned) {
			errors.push(
				new TransactionError(
					'Cannot apply proof-of-misbehavior. Delegate is banned.',
					this.id,
					'.asset.header1.generatorPublicKey',
					this.asset.header1.generatorPublicKey,
				),
			);
		}

		if (
			isPunished(
				delegateAccount,
				delegateAccount,
				store.chain.lastBlockHeader.height,
			)
		) {
			errors.push(
				new TransactionError(
					'Cannot apply proof-of-misbehavior. Delegate is already punished. ',
					this.id,
					'.asset.header1.generatorPublicKey',
					this.asset.header1.generatorPublicKey,
				),
			);
		}

		/* 
			Check block signatures validity 
		*/

		const blockHeader1Bytes = Buffer.concat([
			Buffer.from(networkIdentifier, 'hex'),
			getBlockBytes(this.asset.header1),
		]);
		const blockHeader2Bytes = Buffer.concat([
			Buffer.from(networkIdentifier, 'hex'),
			getBlockBytes(this.asset.header2),
		]);

		const { valid: validHeader1Signature } = validateSignature(
			this.asset.header1.generatorPublicKey,
			this.asset.header1.blockSignature,
			blockHeader1Bytes,
		);

		if (!validHeader1Signature) {
			errors.push(
				new TransactionError(
					'Invalid block signature for header 1.',
					this.id,
					'.asset.header1.blockSignature',
					this.asset.header1.blockSignature,
				),
			);
		}
		const { valid: validHeader2Signature } = validateSignature(
			this.asset.header2.generatorPublicKey,
			this.asset.header2.blockSignature,
			blockHeader2Bytes,
		);

		if (!validHeader2Signature) {
			errors.push(
				new TransactionError(
					'Invalid block signature for header 2.',
					this.id,
					'.asset.header2.blockSignature',
					this.asset.header2.blockSignature,
				),
			);
		}

		/*
			Update sender account
		*/
		const reward =
			store.chain.lastBlockReward > delegateAccount.balance
				? delegateAccount.balance
				: store.chain.lastBlockReward;

		senderAccount.balance += reward;
		// We store the correct reward value in the asset at apply time to allow for undoing the transaction at a later point in time
		this.asset.reward = reward;

		store.account.set(senderAccount.address, senderAccount);

		/*
			Update delegate account
		*/
		const delegateId = getAddressFromPublicKey(
			this.asset.header1.generatorPublicKey,
		);
		delegateAccount.delegate.pomHeights.push(currentHeight);

		if (delegateAccount.delegate.pomHeights.length >= MAX_POM_HEIGHTS) {
			delegateAccount.delegate.isBanned = true;
		}
		delegateAccount.balance -= reward;
		store.account.set(delegateAccount.address, delegateAccount);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const currentHeight = store.chain.lastBlockHeader.height + 1;

		const senderAccount = await store.account.get(this.senderId);

		/*
			Update sender account
		*/
		senderAccount.balance -= this.asset.reward as bigint;
		store.account.set(senderAccount.address, senderAccount);

		/*
			Update delegate account
		*/
		const delegateId = getAddressFromPublicKey(
			this.asset.header1.generatorPublicKey,
		);
		const delegateAccount = await store.account.get(delegateId);
		const pomIndex = delegateAccount.delegate.pomHeights.findIndex(
			height => height === currentHeight,
		);
		delegateAccount.delegate.pomHeights.splice(pomIndex, 1);
		// tslint:disable-next-line no-magic-numbers
		if (delegateAccount.delegate.pomHeights.length < 5) {
			delegateAccount.delegate.isBanned = false;
		}

		delegateAccount.balance += this.asset.reward as bigint;
		store.account.set(delegateAccount.address, delegateAccount);

		return [];
	}
}
