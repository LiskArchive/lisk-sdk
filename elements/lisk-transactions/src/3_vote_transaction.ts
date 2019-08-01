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
import * as BigNum from '@liskhq/bignum';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { MAX_TRANSACTION_AMOUNT, VOTE_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { CreateBaseTransactionInput, verifyAmountBalance } from './utils';
import { validateAddress, validator } from './utils/validation';

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

export class VoteTransaction extends BaseTransaction {
	public readonly containsUniqueData: boolean;
	public readonly asset: VoteAsset;
	public static TYPE = 3;
	public static FEE = VOTE_FEE.toString();

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset || {}) as VoteAsset;
		this.containsUniqueData = true;
	}

	protected assetToBytes(): Buffer {
		return Buffer.from(this.asset.votes.join(''), 'utf8');
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
		validator.validate(voteAssetFormatSchema, this.asset);
		const errors = convertToAssetError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for vote transaction',
					this.id,
					'.amount',
					this.amount.toString(),
					'0',
				),
			);
		}

		try {
			validateAddress(this.recipientId);
		} catch (err) {
			errors.push(
				new TransactionError(
					'RecipientId must be set for vote transaction',
					this.id,
					'.recipientId',
					this.recipientId,
				),
			);
		}

		if (
			this.recipientPublicKey &&
			this.recipientId !== getAddressFromPublicKey(this.recipientPublicKey)
		) {
			errors.push(
				new TransactionError(
					'recipientId does not match recipientPublicKey.',
					this.id,
					'.recipientId',
				),
			);
		}

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);
		// Deduct amount from sender in case of exceptions
		// See issue: https://github.com/LiskHQ/lisk-elements/issues/1215
		const balanceError = verifyAmountBalance(
			this.id,
			sender,
			this.amount,
			this.fee,
		);
		if (balanceError) {
			errors.push(balanceError);
		}
		const updatedSenderBalance = new BigNum(sender.balance).sub(this.amount);

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
			balance: updatedSenderBalance.toString(),
			votedDelegatesPublicKeys,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.account.get(this.senderId);
		const updatedSenderBalance = new BigNum(sender.balance).add(this.amount);

		// Deduct amount from sender in case of exceptions
		// See issue: https://github.com/LiskHQ/lisk-elements/issues/1215
		if (updatedSenderBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(
				new TransactionError(
					'Invalid amount',
					this.id,
					'.amount',
					this.amount.toString(),
				),
			);
		}

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
			balance: updatedSenderBalance.toString(),
			votedDelegatesPublicKeys,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	// tslint:disable:next-line: prefer-function-over-method no-any
	protected assetFromSync(raw: any): object | undefined {
		if (!raw.v_votes) {
			return undefined;
		}
		const votes = raw.v_votes.split(',');

		return { votes };
	}
}
