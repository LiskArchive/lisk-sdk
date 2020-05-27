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

import { codec, GenericObject } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey, bufferToHex } from '@liskhq/lisk-cryptography';

import { BaseTransaction, StateStore } from './base_transaction';
import {
	MAX_POM_HEIGHTS,
	MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE,
} from './constants';
import { TransactionError } from './errors';
import {
	getPunishmentPeriod,
	validateSignature,
} from './utils';
import { BlockHeader } from './types';

const proofOfMisbehaviorAssetSchema = {
	$id: 'lisk/proof-of-misbehavior-transaction',
	type: 'object',
	required: ['header1', 'header2'],
	properties: {
		header1: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		header2: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
};

const blockHeaderSchema = {
	$id: 'lisk/block-header',
	type: 'object',
	required: ['height', 'version', 'timestamp', 'previousBlockId', 'generatorPublicKey', 'numberOfTransactions', 'payloadLength', 'transactionRoot', 'maxHeightPreviouslyForged', 'maxHeightPrevoted', 'totalAmount', 'totalFee', 'reward', 'seedReveal'],
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		version: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		previousBlockId: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		generatorPublicKey: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		numberOfTransactions: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
		payloadLength: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		transactionRoot: {
			dataType: 'bytes',
			fieldNumber: 8,
		},
		maxHeightPreviouslyForged: {
			dataType: 'uint32',
			fieldNumber: 9,
		},
		totalAmount: {
			dataType: 'uint64',
			fieldNumber: 10,
		},
		totalFee: {
			dataType: 'uint64',
			fieldNumber: 11,
		},
		reward: {
			dataType: 'uint64',
			fieldNumber: 12,
		},
		seedReveal: {
			dataType: 'bytes',
			fieldNumber: 13,
		},
	},
};

export interface ProofOfMisbehaviorAsset {
	readonly header1: BlockHeader;
	readonly header2: BlockHeader;
	reward: bigint;
}

export class ProofOfMisbehaviorTransaction extends BaseTransaction {
	public static TYPE = 15;
	public static ASSET_SCHEMA = proofOfMisbehaviorAssetSchema;
	public readonly asset: ProofOfMisbehaviorAsset;

	public constructor(transaction: ProofOfMisbehaviorTransaction) {
		super(transaction);

		this.asset = transaction.asset;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const errors = [];

		if (
			this.asset.header1.generatorPublicKey !==
			this.asset.header2.generatorPublicKey
		) {
			errors.push(
				new TransactionError(
					'GeneratorPublicKey of each BlockHeader should match.',
					this.id,
					'.asset.header1.generatorPublicKey',
				),
			);
		}

		if (
			Buffer.compare(
				this._getBlockHeaderBytes(this.asset.header1),
				this._getBlockHeaderBytes(this.asset.header2),
			) === 0
		) {
			errors.push(
				new TransactionError(
					'BlockHeaders are identical. No contradiction detected.',
					this.id,
					'.asset.header1',
				),
			);
		}

		/*
            Check for BFT violations:
                1. Double forging
                2. Disjointedness
                3. Branch is not the one with largest maxHeighPrevoted
        */

		let b1 = this.asset.header1;
		let b2 = this.asset.header2;

		// Order the two block headers such that b1 must be forged first
		if (
			b1.maxHeightPreviouslyForged > b2.maxHeightPreviouslyForged ||
			(b1.maxHeightPreviouslyForged === b2.maxHeightPreviouslyForged &&
				b1.maxHeightPrevoted > b2.maxHeightPrevoted) ||
			(b1.maxHeightPreviouslyForged === b2.maxHeightPreviouslyForged &&
				b1.maxHeightPrevoted === b2.maxHeightPrevoted &&
				b1.height > b2.height)
		) {
			b1 = this.asset.header2;
			b2 = this.asset.header1;
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
					'BlockHeaders are not contradicting as per BFT violation rules.',
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

		if (
			Math.abs(this.asset.header1.height - currentHeight) >=
			MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE
		) {
			errors.push(
				new TransactionError(
					`Difference between header1.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
					this.id,
					'.asset.header1',
					this.asset.header1.height,
				),
			);
		}

		if (
			Math.abs(this.asset.header2.height - currentHeight) >=
			MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE
		) {
			errors.push(
				new TransactionError(
					`Difference between header2.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
					this.id,
					'.asset.header2',
					this.asset.header2.height,
				),
			);
		}

		/*
			Check if delegate is eligible to be punished
		*/
		const delegateAddress = getAddressFromPublicKey(
			this.asset.header1.generatorPublicKey,
		);
		const delegateAccount = await store.account.getOrDefault(delegateAddress);

		if (!delegateAccount.isDelegate || !delegateAccount.username) {
			errors.push(
				new TransactionError(
					'Account is not a delegate',
					this.id,
					'.asset.header1.generatorPublicKey',
				),
			);

			return errors;
		}

		if (delegateAccount.delegate.isBanned) {
			errors.push(
				new TransactionError(
					'Cannot apply proof-of-misbehavior. Delegate is banned.',
					this.id,
					'.asset.header1.generatorPublicKey',
					this.asset.header1.generatorPublicKey.toString('hex'),
				),
			);

			return errors;
		}

		if (
			getPunishmentPeriod(
				delegateAccount,
				delegateAccount,
				store.chain.lastBlockHeader.height,
			) > 0
		) {
			errors.push(
				new TransactionError(
					'Cannot apply proof-of-misbehavior. Delegate is already punished. ',
					this.id,
					'.asset.header1.generatorPublicKey',
					this.asset.header1.generatorPublicKey.toString('hex'),
				),
			);

			return errors;
		}

		/*
			Check block signatures validity
		*/

		const blockHeader1Bytes = Buffer.concat([
			networkIdentifier,
			this._getBlockHeaderBytes(this.asset.header1),
		]);
		const blockHeader2Bytes = Buffer.concat([
			networkIdentifier,
			this._getBlockHeaderBytes(this.asset.header2),
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
					bufferToHex(this.asset.header1.blockSignature),
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
					bufferToHex(this.asset.header2.blockSignature),
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

		// Fetch delegate account again in case sender and delegate are the same account
		const updatedDelegateAccount = await store.account.get(delegateAddress);

		updatedDelegateAccount.delegate.pomHeights.push(currentHeight);

		if (updatedDelegateAccount.delegate.pomHeights.length >= MAX_POM_HEIGHTS) {
			updatedDelegateAccount.delegate.isBanned = true;
		}
		updatedDelegateAccount.balance -= reward;
		store.account.set(updatedDelegateAccount.address, updatedDelegateAccount);

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
		senderAccount.balance -= this.asset.reward;
		store.account.set(senderAccount.address, senderAccount);

		/*
			Update delegate account
		*/
		const delegateAddress = getAddressFromPublicKey(
			this.asset.header1.generatorPublicKey,
		);
		const delegateAccount = await store.account.get(delegateAddress);
		const pomIndex = delegateAccount.delegate.pomHeights.findIndex(
			height => height === currentHeight,
		);
		delegateAccount.delegate.pomHeights.splice(pomIndex, 1);
		if (delegateAccount.delegate.pomHeights.length < 5) {
			delegateAccount.delegate.isBanned = false;
		}

		delegateAccount.balance += this.asset.reward;
		store.account.set(delegateAccount.address, delegateAccount);

		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	private _getBlockHeaderBytes(header: BlockHeader): Buffer {
		const { blockSignature, ...restOfHeader } = header;
		return codec.encode(blockHeaderSchema, restOfHeader as unknown as GenericObject);
	}
}
