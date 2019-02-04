/*
 * Copyright © 2018 Lisk Foundation
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
import * as BigNum from 'browserify-bignum';
import { VOTE_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import { prependMinusToPublicKeys, prependPlusToPublicKeys } from '../utils';
import {
	validateAddress,
	validatePublicKeys,
	validator,
} from '../utils/validation';
import {
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	StateStore,
	StateStoreCache,
} from './base';

const PREFIX_UPVOTE = '+';
const PREFIX_UNVOTE = '-';
const MAX_VOTE_PER_ACCOUNT = 101;
const MIN_VOTE_PER_TX = 1;
const MAX_VOTE_PER_TX = 33;
const TRANSACTION_VOTE_TYPE = 3;

export interface VoteAsset {
	readonly votes: ReadonlyArray<string>;
}

export interface CreateVoteAssetInput {
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
}

export type CastVoteInput = CreateBaseTransactionInput & CreateVoteAssetInput;

export const voteAssetTypeSchema = {
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
	},
};

export const voteAssetFormatSchema = {
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
			uniqueSignedPublicKeys: true,
			minItems: MIN_VOTE_PER_TX,
			maxItems: MAX_VOTE_PER_TX,
			items: {
				type: 'string',
				format: 'signedPublicKey',
			},
		},
	},
};

const validateInputs = ({
	votes = [],
	unvotes = [],
}: CreateVoteAssetInput): void => {
	if (!Array.isArray(votes)) {
		throw new Error(
			'Please provide a valid votes value. Expected an array if present.',
		);
	}
	if (!Array.isArray(unvotes)) {
		throw new Error(
			'Please provide a valid unvotes value. Expected an array if present.',
		);
	}
	validatePublicKeys([...votes, ...unvotes]);
};

export class VoteTransaction extends BaseTransaction {
	public readonly containsUniqueData = true;
	public readonly asset: VoteAsset;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(voteAssetTypeSchema, tx.asset);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							tx.id,
							error.dataPath,
						),
			  )
			: [];
		if (!typeValid) {
			throw new TransactionMultiError('Invalid field types', tx.id, errors);
		}
		this.asset = tx.asset as VoteAsset;
		this._fee = new BigNum(VOTE_FEE);
	}

	public static create(input: CastVoteInput): object {
		validateInputs(input);
		const { passphrase, secondPassphrase, votes = [], unvotes = [] } = input;

		const plusPrependedVotes = prependPlusToPublicKeys(votes);
		const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
		const allVotes: ReadonlyArray<string> = [
			...plusPrependedVotes,
			...minusPrependedUnvotes,
		];

		const transaction = {
			...createBaseTransaction(input),
			type: 3,
			fee: VOTE_FEE.toString(),
			asset: {
				votes: allVotes,
			},
		};

		if (!passphrase) {
			return transaction;
		}

		const transactionWithSenderInfo = {
			...transaction,
			// SenderId and SenderPublicKey are expected to be exist from base transaction
			senderId: transaction.senderId as string,
			senderPublicKey: transaction.senderPublicKey as string,
			recipientId: transaction.senderId as string,
			recipientPublicKey: transaction.senderPublicKey,
		};

		const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
		voteTransaction.sign(passphrase, secondPassphrase);

		return voteTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): VoteTransaction {
		const transaction = new VoteTransaction(tx);
		const { errors, status } = transaction.validate();

		if (status === Status.FAIL && errors.length !== 0) {
			throw new TransactionMultiError(
				'Failed to validate schema.',
				tx.id,
				errors,
			);
		}

		return transaction;
	}

	protected getAssetBytes(): Buffer {
		return Buffer.from(this.asset.votes.join(''), 'utf8');
	}

	public assetToJSON(): object {
		return {
			votes: this.asset.votes,
		};
	}

	public async prepareTransaction(store: StateStoreCache): Promise<void> {
		const publicKey = this.asset.votes.map(pkWithAction =>
			pkWithAction.slice(1),
		);
		await store.account.cache({
			address: [this.senderId],
			publicKey: publicKey,
		});
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
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];
		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for vote transaction',
					this.id,
					'.amount',
				),
			);
		}

		if (this.type !== TRANSACTION_VOTE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		try {
			validateAddress(this.recipientId);
		} catch (err) {
			errors.push(
				new TransactionError(
					'RecipientId must be set for vote transaction',
					this.id,
					'.recipientId',
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

		if (!this.fee.eq(VOTE_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${VOTE_FEE}`,
					this.id,
					'.fee',
				),
			);
		}

		if (!this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'RecipientPublicKey must be set for vote transaction',
					this.id,
					'.recipientPublicKey',
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

		const assetErrors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];
		errors.push(...assetErrors);

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get<Account>('address', this.senderId);
		this.asset.votes.forEach(actionVotes => {
			const vote = actionVotes.substring(1);
			const { username } = store.account.get<Account>(
				'publicKey',
				vote,
			);
			if (username === undefined || username === '') {
				errors.push(
					new TransactionError(`${vote} is not a delegate.`, this.id),
				);
			}
		});
		const senderVotes = sender.votes || [];
		this.asset.votes.forEach(vote => {
			const action = vote.charAt(0);
			const publicKey = vote.substring(1);
			// Check duplicate votes
			if (action === PREFIX_UPVOTE && senderVotes.includes(publicKey)) {
				errors.push(
					new TransactionError(`${publicKey} is already voted.`, this.id),
				);
				// Check non-existing unvotes
			} else if (action === PREFIX_UNVOTE && !senderVotes.includes(publicKey)) {
				errors.push(
					new TransactionError(`${publicKey} is not voted.`, this.id),
				);
			}
		});
		const upvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UPVOTE)
			.map(vote => vote.substring(1));
		const unvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UNVOTE)
			.map(vote => vote.substring(1));
		const originalVotes = sender.votes || [];
		const votes: ReadonlyArray<string> = [...originalVotes, ...upvotes].filter(
			vote => !unvotes.includes(vote),
		);
		if (votes.length > MAX_VOTE_PER_ACCOUNT) {
			errors.push(
				new TransactionError(
					`Vote cannot exceed ${MAX_VOTE_PER_ACCOUNT} but has ${votes.length}.`,
					this.id,
				),
			);
		}
		const updatedSender = {
			...sender,
			votes,
		};
		store.account.set<Account>(updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.account.get<Account>('address', this.senderId);
		const upvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UPVOTE)
			.map(vote => vote.substring(1));
		const unvotes = this.asset.votes
			.filter(vote => vote.charAt(0) === PREFIX_UNVOTE)
			.map(vote => vote.substring(1));
		const originalVotes = sender.votes || [];
		const votes: ReadonlyArray<string> = [...originalVotes, ...unvotes].filter(
			vote => !upvotes.includes(vote),
		);
		if (votes.length > MAX_VOTE_PER_ACCOUNT) {
			errors.push(
				new TransactionError(
					`Vote cannot exceed ${MAX_VOTE_PER_ACCOUNT} but has ${votes.length}.`,
					this.id,
				),
			);
		}
		const updatedSender = {
			...sender,
			votes,
		};
		store.account.set<Account>(updatedSender);

		return errors;
	}
}
