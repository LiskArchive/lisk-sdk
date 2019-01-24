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
import BigNum from 'browserify-bignum';
import { VOTE_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import { prependMinusToPublicKeys, prependPlusToPublicKeys } from '../utils';
import {
	isTypedObjectArrayWithKeys,
	validateAddress,
	validatePublicKeys,
	validator,
} from '../utils/validation';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	ENTITY_ACCOUNT,
	EntityMap,
	RequiredState,
	TransactionResponse,
} from './base';

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

export interface RequiredVoteState extends RequiredState {
	readonly dependentState?: {
		readonly [ENTITY_ACCOUNT]: ReadonlyArray<Account>;
	};
}

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
		const { errors, status } = transaction.validateSchema();

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

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();
		const publicKey = this.asset.votes.map(pkWithAction =>
			pkWithAction.slice(1),
		);

		return {
			[ENTITY_ACCOUNT]: {
				...attr[ENTITY_ACCOUNT],
				publicKey,
			},
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const sameTypeTransactions = transactions
			.filter(
				tx =>
					tx.senderPublicKey === this.senderPublicKey && tx.type === this.type,
			)
			.map(tx => new VoteTransaction(tx));
		const publicKeys = this.asset.votes.map(vote => vote.substring(1));

		const errors = sameTypeTransactions.reduce(
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

		return {
			id: this.id,
			errors,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
		};
	}

	public processRequiredState(state: EntityMap): RequiredVoteState {
		const { sender } = super.processRequiredState(state);
		const votes = this.asset.votes.map(vote => vote.substring(1));

		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'publicKey'])
		) {
			throw new Error('Required state does not have valid account type.');
		}
		const dependentAccounts = accounts.filter(acct =>
			votes.includes(acct.publicKey),
		);
		if (votes.length !== dependentAccounts.length) {
			throw new Error('Not enough accounts in dependent state.');
		}

		return {
			sender,
			dependentState: {
				[ENTITY_ACCOUNT]: dependentAccounts,
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { errors: baseErrors, status } = super.validateSchema();
		const valid = validator.validate(voteAssetFormatSchema, this.asset);
		const errors = [...baseErrors];
		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for vote transaction',
					this.id,
					'.asset',
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

		return {
			id: this.id,
			status:
				status === Status.OK && valid && errors.length === 0
					? Status.OK
					: Status.FAIL,
			errors,
		};
	}

	public verify({
		sender,
		dependentState,
	}: RequiredVoteState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		if (!dependentState) {
			throw new Error('Dependent state is required for vote transaction.');
		}
		const errors = [...baseErrors];
		const dependentAccounts = dependentState[ENTITY_ACCOUNT];
		if (!dependentAccounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(dependentAccounts, ['publicKey'])
		) {
			throw new Error('Required state does not have valid account type.');
		}
		dependentAccounts.forEach(({ publicKey, username }) => {
			if (username === undefined || username === '') {
				errors.push(
					new TransactionError(`${publicKey} is not a delegate.`, this.id),
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
		const votes: ReadonlyArray<string> = [...senderVotes, ...upvotes].filter(
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

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({ sender }: RequiredVoteState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		if (!state) {
			throw new Error('State is required for applying transaction.');
		}
		const errors = [...baseErrors];
		const { sender: updatedSender } = state;
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

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: {
					...updatedSender,
					votes,
				},
			},
		};
	}

	public undo({ sender }: RequiredVoteState): TransactionResponse {
		const { errors: baseErrors, state } = super.undo({ sender });
		if (!state) {
			throw new Error('State is required for undoing transaction.');
		}
		const errors = [...baseErrors];
		const { sender: updatedSender } = state;
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

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: {
					...updatedSender,
					votes,
				},
			},
		};
	}
}
