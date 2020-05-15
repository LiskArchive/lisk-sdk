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
 *
 */
import { intToBuffer, hexToBuffer } from '@liskhq/lisk-cryptography';
import { isNumberString, validator } from '@liskhq/lisk-validator';

import { BaseTransaction, StateStore } from './base_transaction';
import { MAX_INT64 } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { sortUnlocking } from './utils';

export interface Vote {
	readonly delegateAddress: string;
	readonly amount: bigint;
}

export interface VoteAsset {
	readonly votes: ReadonlyArray<Vote>;
}

const voteAssetFormatSchema = {
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
			minItems: 1,
			maxItems: 20,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount'],
				properties: {
					delegateAddress: {
						type: 'string',
						format: 'address',
					},
					amount: {
						type: 'string',
						format: 'int64',
					},
				},
			},
		},
	},
};

const SIZE_INT64 = 8;
const TEN_UNIT = BigInt(10) * BigInt(10) ** BigInt(8);
const MAX_VOTE = 10;
const MAX_UNLOCKING = 20;

export interface RawAssetVote {
	readonly delegateAddress: string;
	readonly amount: string;
}

interface RawAsset {
	readonly votes: ReadonlyArray<RawAssetVote>;
}

export class VoteTransaction extends BaseTransaction {
	public static TYPE = 13;
	public readonly asset: VoteAsset;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		if (tx.asset) {
			const rawAsset = tx.asset as RawAsset;
			this.asset = {
				votes: rawAsset.votes.map(vote => {
					const amount = isNumberString(vote.amount)
						? BigInt(vote.amount)
						: BigInt(0);

					return {
						delegateAddress: vote.delegateAddress,
						amount,
					};
				}),
			};
		} else {
			this.asset = { votes: [] };
		}
	}

	public assetToJSON(): object {
		return {
			votes: this.asset.votes.map(vote => ({
				delegateAddress: vote.delegateAddress,
				amount: vote.amount.toString(),
			})),
		};
	}

	protected assetToBytes(): Buffer {
		const bufferArray = [];
		for (const vote of this.asset.votes) {
			const addressBuffer = hexToBuffer(vote.delegateAddress);
			bufferArray.push(addressBuffer);
			const amountBuffer = intToBuffer(
				vote.amount.toString(),
				SIZE_INT64,
				'big',
				true,
			);
			bufferArray.push(amountBuffer);
		}

		return Buffer.concat(bufferArray);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const asset = this.assetToJSON();
		const schemaErrors = validator.validate(voteAssetFormatSchema, asset);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		let upvoteCount = 0;
		let downvoteCount = 0;
		const addressSet = new Set();
		for (const vote of this.asset.votes) {
			addressSet.add(vote.delegateAddress);
			if (vote.amount > BigInt(0)) {
				upvoteCount += 1;
			} else if (vote.amount < BigInt(0)) {
				downvoteCount += 1;
			} else {
				errors.push(
					new TransactionError(
						'Amount cannot be 0',
						this.id,
						'.asset.votes.amount',
					),
				);
			}
			if (vote.amount % TEN_UNIT !== BigInt(0)) {
				errors.push(
					new TransactionError(
						'Amount should be multiple of 10 * 10^8',
						this.id,
						'.asset.votes.amount',
						vote.amount.toString(),
					),
				);
			}
		}
		if (upvoteCount > MAX_VOTE) {
			errors.push(
				new TransactionError(
					'Upvote can only be casted upto 10',
					this.id,
					'.asset.votes',
					upvoteCount,
					'10',
				),
			);
		}
		if (downvoteCount > MAX_VOTE) {
			errors.push(
				new TransactionError(
					'Downvote can only be casted upto 10',
					this.id,
					'.asset.votes',
					upvoteCount,
					'10',
				),
			);
		}
		if (addressSet.size !== this.asset.votes.length) {
			errors.push(
				new TransactionError(
					'Delegate address must be unique',
					this.id,
					'.asset.votes.delegateAddress',
				),
			);
		}

		return errors;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		// Only order should be change, so no need to copy object itself
		const assetCopy = [...this.asset.votes];
		// Sort by acending amount
		assetCopy.sort((a, b) => {
			const diff = a.amount - b.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});
		const errors = [];

		for (const vote of assetCopy) {
			const sender = await store.account.get(this.senderId);
			const votedDelegate = await store.account.getOrDefault(
				vote.delegateAddress,
			);

			if (!votedDelegate.username) {
				errors.push(
					new TransactionError(
						'Voted delegate is not registered',
						this.id,
						'.asset.votes.delegateAddress',
					),
				);
				// eslint-disable-next-line no-continue
				continue;
			}
			if (vote.amount < BigInt(0)) {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				if (originalUpvoteIndex < 0) {
					errors.push(
						new TransactionError(
							'Cannot cast downvote to delegate who is not upvoted',
							this.id,
							'.asset.votes.delegateAddress',
						),
					);
					// eslint-disable-next-line no-continue
					continue;
				}
				sender.votes[originalUpvoteIndex].amount += vote.amount;
				if (sender.votes[originalUpvoteIndex].amount < BigInt(0)) {
					errors.push(
						new TransactionError(
							'Cannot downvote more than upvoted',
							this.id,
							'.asset.votes.amount',
						),
					);
				}
				// Delete entry when amount becomes 0
				if (sender.votes[originalUpvoteIndex].amount === BigInt(0)) {
					sender.votes = sender.votes.filter(
						senderVote => senderVote.delegateAddress !== vote.delegateAddress,
					);
				}
				// Create unlocking object
				sender.unlocking.push({
					delegateAddress: vote.delegateAddress,
					amount: BigInt(-1) * vote.amount,
					unvoteHeight: store.chain.lastBlockHeader.height + 1,
				});
				// Sort account.unlocking
				sortUnlocking(sender.unlocking);

				// Unlocking object should not exceed maximum
				if (sender.unlocking.length > MAX_UNLOCKING) {
					errors.push(
						new TransactionError(
							`Cannot downvote which exceeds account.unlocking to have more than ${MAX_UNLOCKING.toString()}`,
							this.id,
							'.asset.votes',
						),
					);
				}
			} else {
				// Upvote amount case
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				const index =
					originalUpvoteIndex > -1 ? originalUpvoteIndex : sender.votes.length;
				const upvote =
					originalUpvoteIndex > -1
						? sender.votes[originalUpvoteIndex]
						: {
								delegateAddress: vote.delegateAddress,
								amount: BigInt(0),
						  };
				upvote.amount += vote.amount;
				// Special case for postgres because maximum is int64 for bigint in postgres
				if (upvote.amount > BigInt(MAX_INT64)) {
					errors.push(
						new TransactionError(
							'Cannot upvote which exceeds int64',
							this.id,
							'.asset.votes.amount',
						),
					);
				}
				// Balance is checked in the base transaction
				sender.balance -= vote.amount;
				sender.votes[index] = upvote;
				// Sort account.votes
				sender.votes.sort((a, b) =>
					a.delegateAddress.localeCompare(b.delegateAddress, 'en'),
				);
				if (sender.votes.length > MAX_VOTE) {
					errors.push(
						new TransactionError(
							`Account can only vote upto ${MAX_VOTE.toString()}`,
							this.id,
							'.asset.votes.amount',
						),
					);
				}
			}
			store.account.set(sender.address, sender);
			// In case of self-vote, sender needs to be set and re-fetched to reflect both account change
			const delegate = await store.account.get(vote.delegateAddress);
			delegate.totalVotesReceived += vote.amount;
			store.account.set(delegate.address, delegate);
		}

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const assetCopy = [...this.asset.votes];
		// Sort by descending amount
		assetCopy.sort((a, b) => {
			const diff = b.amount - a.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});
		for (const vote of assetCopy) {
			const sender = await store.account.get(this.senderId);
			if (vote.amount < BigInt(0)) {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				const index =
					originalUpvoteIndex > -1 ? originalUpvoteIndex : sender.votes.length;
				// If upvote does not exist anymore, it needs to re-adde them
				const upvote =
					originalUpvoteIndex > -1
						? sender.votes[originalUpvoteIndex]
						: {
								delegateAddress: vote.delegateAddress,
								amount: BigInt(0),
						  };
				// Add back the vote
				upvote.amount += vote.amount * BigInt(-1);
				sender.votes[index] = upvote;

				// Remove unlocking object
				const unlockingIndex = sender.unlocking.findIndex(
					unlock =>
						unlock.delegateAddress === vote.delegateAddress &&
						unlock.amount === vote.amount * BigInt(-1) &&
						unlock.unvoteHeight === store.chain.lastBlockHeader.height + 1,
				);
				if (unlockingIndex < 0) {
					throw new Error(
						'Invalid data. unlocking object should exist while undo',
					);
				}
				sender.unlocking.splice(unlockingIndex, 1);

				// Sort votes in case of readding
				sender.votes.sort((a, b) =>
					a.delegateAddress.localeCompare(b.delegateAddress, 'en'),
				);
				// Sort account.unlocking
				sortUnlocking(sender.unlocking);
			} else {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				if (originalUpvoteIndex < 0) {
					throw new Error('Invalid data. Upvote should exist while undo');
				}
				sender.votes[originalUpvoteIndex].amount -= vote.amount;
				if (sender.votes[originalUpvoteIndex].amount === BigInt(0)) {
					sender.votes.splice(originalUpvoteIndex, 1);
				}
				sender.balance += vote.amount;
				// Sort account.votes
				sender.votes.sort((a, b) =>
					a.delegateAddress.localeCompare(b.delegateAddress, 'en'),
				);
			}
			store.account.set(sender.address, sender);
			// In case of self-vote, sender needs to be set and re-fetched to reflect both account change
			const delegate = await store.account.get(vote.delegateAddress);
			delegate.totalVotesReceived += vote.amount * BigInt(-1);
			store.account.set(delegate.address, delegate);
		}

		return [];
	}
}
