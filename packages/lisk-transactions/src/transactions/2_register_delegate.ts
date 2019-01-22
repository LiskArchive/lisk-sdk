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
import BigNum from 'browserify-bignum';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	DelegateAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import {
	calculateFee,
	validator,
} from '../utils';
import { isTypedObjectArrayWithKeys } from '../utils/validation';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	ENTITY_ACCOUNT,
	ENTITY_TRANSACTION,
	EntityMap,
	TransactionResponse,
} from './base';

export interface RequiredDelegateState {
	readonly sender: Account;
	readonly dependentState: {
		readonly [ENTITY_ACCOUNT]: ReadonlyArray<Account>;
	};
}

export interface DelegateObject {
	readonly username: string;
	readonly publicKey: string;
}

export interface DelegateAsset {
	readonly delegate: DelegateObject;
}

const TRANSACTION_DELEGATE_REGISTER = 2;

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
					minLength: 1,
					maxLength: 20,
				},
				// FIXME: Required?
				publicKey: { type: 'string' },
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
				// FIXME: Required?
				publicKey: { type: 'string', format: 'publicKey' },
			},
		},
	},
};

export interface CreateDelegateRegistrationInput {
	readonly username: string;
	readonly passphrase: string;
	readonly secondPassphrase?: string;
}

const validateInput = ({ username }: CreateDelegateRegistrationInput): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}
};

export class DelegateRegistrationTransaction extends BaseTransaction {
	public readonly asset: DelegateAsset;
	public readonly containsUniqueData = true;
	public readonly fee: BigNum;

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
		this.fee = calculateFee(this.type);
	}

	public static create(input: CreateDelegateRegistrationInput): object {
		validateInput(input);
		const { username, passphrase, secondPassphrase } = input;

		const transaction = {
			...createBaseTransaction(input),
			type: 2,
			fee: calculateFee(TRANSACTION_DELEGATE_REGISTER).toString(),
			asset: { delegate: { username } },
		};

		if (!passphrase) {
			return transaction;
		}

		const transactionWithSenderInfo = {
			...transaction,
			senderId: transaction.senderId as string,
			senderPublicKey: transaction.senderPublicKey as string,
		};

		const transferTransaction = new DelegateRegistrationTransaction(
			transactionWithSenderInfo,
		);
		transferTransaction.sign(passphrase, secondPassphrase);

		return transferTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): DelegateRegistrationTransaction {
		const transaction = new DelegateRegistrationTransaction(tx);
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

		return username && typeof username === 'string'
			? Buffer.from(username, 'utf8')
			: Buffer.alloc(0);
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
				// FIXME:
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
					tx.senderPublicKey === this.senderPublicKey && tx.type === this.type,
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
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'publicKey'])
		) {
			throw new Error('Required state does not have valid account type');
		}

		const sender = accounts.find(acct => acct.address === this.senderId);
		if (!sender) {
			throw new Error('No sender account is found.');
		}
		const dependentAccount = accounts.find(
			acct =>
				typeof acct.delegate === 'object' &&
				acct.delegate.username === this.asset.delegate.username,
		);

		return {
			sender,
			dependentState: {
				[ENTITY_ACCOUNT]: [dependentAccount] as ReadonlyArray<Account>,
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { status, errors: baseErrors } = super.validateSchema();
		const errors = [...baseErrors];
		const valid = validator.validate(delegateAssetFormatSchema, this.asset);
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
		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for delegate registration transaction',
					this.id,
					'.asset',
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
					'Recipient public key must be empty',
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
		const {
			errors: baseErrors,
		} = super.apply({ sender });
		if (!dependentState) {
			throw new Error('Dependent state is required for delegate registration transaction.');
		}
		const errors = [...baseErrors];
		const dependentAccount = dependentState[ENTITY_ACCOUNT];

		if (sender.isDelegate) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.isDelegate',
				),
			);
		}

		const usernameUnique = dependentAccount.every(
			({ username }) => username !== this.asset.delegate.username,
		);

		if (!usernameUnique) {
			errors.push(
				new TransactionError(
					`Username is not unique.`,
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

	public apply({ sender }: RequiredDelegateState): TransactionResponse {
		const {
			errors: baseErrors,
		} = super.apply({ sender });
		const errors = [...baseErrors];
		// Ignore state from the base transaction
		const updatedBalance = new BigNum(sender.balance)
			.sub(this.fee);
		const updatedSender = { ...sender, balance: updatedBalance.toString() }; 
		if (updatedSender.isDelegate) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.isDelegate',
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
					isDelegate: true,
					delegate: {
						username: this.asset.delegate.username,
					},
				},
			},
		};
	}

	public undo({ sender }: RequiredDelegateState): TransactionResponse {
		const {
			errors: baseErrors,
		} = super.undo({ sender });
		const errors = [...baseErrors];
		// Ignore state from the base transaction
		const updatedBalance = new BigNum(sender.balance)
			.add(this.fee);
		const updatedSender = { ...sender, balance: updatedBalance.toString() }; 
		const { delegate, ...strippedSender } = updatedSender;

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: { ...strippedSender, isDelegate: false },
			},
		};
	}
}
