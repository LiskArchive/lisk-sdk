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
import { stringToBuffer } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { VOTE_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { CreateBaseTransactionInput } from './utils';

const PREFIX_UPVOTE = '+';
const PREFIX_UNVOTE = '-';
const MAX_VOTE_PER_ACCOUNT = 101;
const MIN_VOTE_PER_TX = 1;
const MAX_VOTE_PER_TX = 33;

export interface VoteAsset {
	readonly votes: ReadonlyArray<string>;
}

export interface CreateVoteAssetInput {
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
}

export type CastVoteInput = CreateBaseTransactionInput & CreateVoteAssetInput;

export const voteAssetFormatSchema = {
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
			minItems: MIN_VOTE_PER_TX,
			maxItems: MAX_VOTE_PER_TX,
			items: {
				type: 'string',
				format: 'signedPublicKey',
			},
			uniqueSignedPublicKeys: true,
		},
	},
};

interface RawAsset {
	readonly recipientId: string;
	readonly amount: string | number;
	readonly votes: ReadonlyArray<string>;
}

export class VoteTransaction extends BaseTransaction {
	public readonly containsUniqueData: boolean;
	public readonly asset: VoteAsset;
	public static TYPE = 11;
	public static FEE = VOTE_FEE.toString();

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		if (tx.asset) {
			const rawAsset = tx.asset as RawAsset;
			this.asset = {
				votes: rawAsset.votes,
			};
		} else {
			// tslint:disable-next-line no-object-literal-type-assertion
			this.asset = {} as VoteAsset;
		}
		this.containsUniqueData = true;
	}

	public assetToJSON(): object {
		return {
			votes: this.asset.votes,
		};
	}

	protected assetToBytes(): Buffer {
		return stringToBuffer(this.asset.votes.join(''));
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		const publicKeyObjectArray = this.asset.votes.map(pkWithAction => {
			const publicKey = pkWithAction.slice(1);

			return {
				publicKey,
			};
		});
		const filterArray = [
			{
				address: this.senderId,
			},
			...publicKeyObjectArray,
		];

		await store.account.cache(filterArray);
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		const sameTypeTransactions = transactions
			.filter(
				tx =>
					tx.senderPublicKey === this.senderPublicKey && tx.type === this.type,
			)
			.map(tx => new VoteTransaction(tx));
		const publicKeys = this.asset.votes.map(vote => vote.substring(1));

		return sameTypeTransactions.reduce(
			(previous, tx) => {
				const conflictingVotes = tx.asset.votes
					.map(vote => vote.substring(1))
					.filter(publicKey => publicKeys.includes(publicKey));
				if (conflictingVotes.length > 0) {
					return [
						...previous,
						new TransactionError(
							`Transaction includes conflicting votes: ${conflictingVotes.toString()}`,
							this.id,
							'.asset.votes',
						),
					];
				}

				return previous;
			},
			[] as ReadonlyArray<TransactionError>,
		);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const asset = this.assetToJSON();
		const schemaErrors = validator.validate(voteAssetFormatSchema, asset);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);

		this.asset.votes.forEach(actionVotes => {
			const vote = actionVotes.substring(1);
			const voteAccount = store.account.find(
				account => account.publicKey === vote,
			);
			if (
				!voteAccount ||
				(voteAccount &&
					(voteAccount.username === undefined ||
						voteAccount.username === '' ||
						voteAccount.username === null))
			) {
				errors.push(
					new TransactionError(
						`${vote} is not a delegate.`,
						this.id,
						'.asset.votes',
					),
				);
			}
		});
		const senderVotes = sender.votedDelegatesPublicKeys || [];
		this.asset.votes.forEach(vote => {
			const action = vote.charAt(0);
			const publicKey = vote.substring(1);
			// Check duplicate votes
			if (action === PREFIX_UPVOTE && senderVotes.includes(publicKey)) {
				errors.push(
					new TransactionError(
						`${publicKey} is already voted.`,
						this.id,
						'.asset.votes',
					),
				);
				// Check non-existing unvotes
			} else if (action === PREFIX_UNVOTE && !senderVotes.includes(publicKey)) {
				errors.push(
					new TransactionError(
						`${publicKey} is not voted.`,
						this.id,
						'.asset.votes',
					),
				);
			}
		});
		const upvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UPVOTE)
			.map(vote => vote.substring(1));
		const unvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UNVOTE)
			.map(vote => vote.substring(1));
		const originalVotes = sender.votedDelegatesPublicKeys || [];
		const votedDelegatesPublicKeys: ReadonlyArray<string> = [
			...originalVotes,
			...upvotes,
		].filter(vote => !unvotes.includes(vote));
		if (votedDelegatesPublicKeys.length > MAX_VOTE_PER_ACCOUNT) {
			errors.push(
				new TransactionError(
					`Vote cannot exceed ${MAX_VOTE_PER_ACCOUNT} but has ${
						votedDelegatesPublicKeys.length
					}.`,
					this.id,
					'.asset.votes',
					votedDelegatesPublicKeys.length.toString(),
					MAX_VOTE_PER_ACCOUNT,
				),
			);
		}
		const updatedSender = {
			...sender,
			votedDelegatesPublicKeys,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.account.get(this.senderId);

		const upvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UPVOTE)
			.map(vote => vote.substring(1));
		const unvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UNVOTE)
			.map(vote => vote.substring(1));
		const originalVotes = sender.votedDelegatesPublicKeys || [];
		const votedDelegatesPublicKeys: ReadonlyArray<string> = [
			...originalVotes,
			...unvotes,
		].filter(vote => !upvotes.includes(vote));
		if (votedDelegatesPublicKeys.length > MAX_VOTE_PER_ACCOUNT) {
			errors.push(
				new TransactionError(
					`Vote cannot exceed ${MAX_VOTE_PER_ACCOUNT} but has ${
						votedDelegatesPublicKeys.length
					}.`,
					this.id,
					'.asset.votes',
					votedDelegatesPublicKeys.length.toString(),
					MAX_VOTE_PER_ACCOUNT,
				),
			);
		}

		const updatedSender = {
			...sender,
			votedDelegatesPublicKeys,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}
}
