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
import * as BigNum from 'browserify-bignum';
import { DELEGATE_FEE, USERNAME_MAX_LENGTH } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	DelegateAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import { validator } from '../utils';
import { isTypedObjectArrayWithKeys } from '../utils/validation';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	ENTITY_ACCOUNT,
	EntityMap,
	TransactionResponse,
} from './base';

const TRANSACTION_DELEGATE_TYPE = 2;

export interface RequiredDelegateState {
	readonly sender: Account;
	readonly dependentState?: {
		readonly [ENTITY_ACCOUNT]: ReadonlyArray<Account>;
	};
}

export interface DelegateObject {
	readonly username: string;
}

export interface DelegateAsset {
	readonly delegate: DelegateObject;
}

export const delegateAssetTypeSchema = {
	type: 'object',
	required: ['delegate'],
	properties: {
		delegate: {
			type: 'object',
			required: ['username'],
			properties: {
				username: {
					type: 'string',
				},
			},
		},
	},
};

export const delegateAssetFormatSchema = {
	type: 'object',
	required: ['delegate'],
	properties: {
		delegate: {
			type: 'object',
			required: ['username'],
			properties: {
				username: {
					type: 'string',
					minLength: 1,
					maxLength: 20,
					format: 'username',
				},
			},
		},
	},
};

export interface CreateDelegateRegistrationInput {
	readonly username: string;
}

export type RegisterDelegateInput = CreateBaseTransactionInput &
	CreateDelegateRegistrationInput;

const validateInput = ({ username }: RegisterDelegateInput): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}
};

export class DelegateTransaction extends BaseTransaction {
	public readonly asset: DelegateAsset;
	public readonly containsUniqueData = true;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(delegateAssetTypeSchema, tx.asset);
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
			throw new TransactionMultiError('Invalid field types', tx.id, [
				...errors,
			]);
		}
		this.asset = tx.asset as DelegateAsset;
		this._fee = new BigNum(DELEGATE_FEE);
	}

	public static create(input: RegisterDelegateInput): object {
		validateInput(input);
		const { username, passphrase, secondPassphrase } = input;

		if (!username || typeof username !== 'string') {
			throw new Error('Please provide a username. Expected string.');
		}

		if (username.length > USERNAME_MAX_LENGTH) {
			throw new Error(
				`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH} characters.`,
			);
		}

		const transaction = {
			...createBaseTransaction(input),
			type: 2,
			fee: DELEGATE_FEE.toString(),
			asset: { delegate: { username } },
		};

		if (!passphrase) {
			return transaction;
		}

		const delegateTransaction = new DelegateTransaction(
			transaction as TransactionJSON,
		);
		delegateTransaction.sign(passphrase, secondPassphrase);

		return delegateTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): DelegateTransaction {
		const transaction = new DelegateTransaction(tx);
		const { errors, status } = transaction.validateSchema();

		if (status === Status.FAIL && errors.length !== 0) {
			throw new TransactionMultiError(
				'Failed to validate schema',
				tx.id,
				errors,
			);
		}

		return transaction;
	}

	protected getAssetBytes(): Buffer {
		const {
			delegate: { username },
		} = this.asset;

		return Buffer.from(username, 'utf8');
	}

	public assetToJSON(): DelegateAsset {
		return {
			...this.asset,
		};
	}

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();

		return {
			[ENTITY_ACCOUNT]: {
				...attr[ENTITY_ACCOUNT],
				username: [this.asset.delegate.username],
			},
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = transactions
			.filter(
				tx =>
					tx.type === this.type && tx.senderPublicKey === this.senderPublicKey,
			)
			.map(
				tx =>
					new TransactionError(
						'Register delegate only allowed once per account.',
						tx.id,
						'.asset.delegate',
					),
			);

		return {
			id: this.id,
			errors,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
		};
	}

	public processRequiredState(state: EntityMap): RequiredDelegateState {
		const { sender } = super.processRequiredState(state);
		const accounts = state[ENTITY_ACCOUNT];

		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'publicKey'])
		) {
			throw new Error('Required state does not have valid account type');
		}

		const dependentAccounts = accounts.filter(
			acct => acct.username === this.asset.delegate.username,
		);

		return {
			sender,
			dependentState: {
				[ENTITY_ACCOUNT]: dependentAccounts,
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { status, errors: baseErrors } = super.validateSchema();
		const valid = validator.validate(delegateAssetFormatSchema, this.asset);
		const errors = [...baseErrors];

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

		if (this.type !== TRANSACTION_DELEGATE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for delegate registration transaction',
					this.id,
					'.amount',
				),
			);
		}

		if (this.recipientId) {
			errors.push(
				new TransactionError('Invalid recipient', this.id, '.recipientId'),
			);
		}

		if (this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'Invalid recipientPublicKey',
					this.id,
					'.recipientPublicKey',
				),
			);
		}

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
	}: RequiredDelegateState): TransactionResponse {
		const { errors: baseErrors } = super.verify({ sender });
		const errors = [...baseErrors];
		const usernameUnique = dependentState
			? dependentState[ENTITY_ACCOUNT].every(
					({ username }) => username !== this.asset.delegate.username,
			  )
			: true;

		if (!usernameUnique) {
			errors.push(
				new TransactionError(
					`Username is not unique.`,
					this.id,
					'.asset.delegate.username',
				),
			);
		}

		if (sender.isDelegate || sender.username) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.asset.delegate.username',
				),
			);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({
		sender,
		dependentState,
	}: RequiredDelegateState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		if (!state) {
			throw new Error('State is required for applying transaction.');
		}
		const errors = [...baseErrors];
		const usernameUnique = dependentState
			? dependentState[ENTITY_ACCOUNT].every(
					({ username }) => username !== this.asset.delegate.username,
			  )
			: true;
		if (!usernameUnique) {
			errors.push(
				new TransactionError(
					`Username is not unique.`,
					this.id,
					'.asset.delegate.username',
				),
			);
		}
		if (state.sender.isDelegate || state.sender.username) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.asset.delegate.username',
				),
			);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: {
					...state.sender,
					isDelegate: true,
					username: this.asset.delegate.username,
				},
			},
		};
	}

	public undo({ sender }: RequiredDelegateState): TransactionResponse {
		const { errors: baseErrors, state } = super.undo({ sender });
		if (!state) {
			throw new Error('State is required for undoing transaction.');
		}
		const errors = [...baseErrors];
		const { username, ...strippedSender } = state.sender;

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: strippedSender,
			},
		};
	}
}
