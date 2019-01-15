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
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { DAPP_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import { isTypedObjectArrayWithKeys, validator } from '../utils/validation';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	ENTITY_ACCOUNT,
	ENTITY_TRANSACTION,
	EntityMap,
	RequiredState,
	TransactionResponse,
} from './base';

export interface DappAsset {
	readonly dapp: {
		readonly category: number;
		readonly description?: string;
		readonly icon?: string;
		readonly link: string;
		readonly name: string;
		readonly tags?: string;
		readonly type: number;
	};
}

export interface DappOptions {
	readonly category: number;
	readonly description?: string;
	readonly icon?: string;
	readonly link: string;
	readonly name: string;
	readonly tags?: string;
	readonly type: number;
}

export interface CreateDappAssetInput {
	readonly options: DappOptions;
}

export type CreateDappInput = CreateBaseTransactionInput & CreateDappAssetInput;

export type Dapp = DappOptions & {
	readonly id: string;
};

export interface RequiredDappState extends RequiredState {
	readonly dependentState?: {
		readonly [ENTITY_TRANSACTION]: ReadonlyArray<TransactionJSON>;
	};
}

export const dappAssetTypeSchema = {
	type: 'object',
	required: ['dapp'],
	properties: {
		dapp: {
			type: 'object',
			required: ['name', 'type', 'category', 'link'],
			properties: {
				icon: {
					type: 'string',
				},
				category: {
					type: 'integer',
				},
				type: {
					type: 'integer',
				},
				link: {
					type: 'string',
				},
				tags: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				name: {
					type: 'string',
				},
			},
		},
	},
};

export const dappAssetFormatSchema = {
	type: 'object',
	required: ['dapp'],
	properties: {
		dapp: {
			type: 'object',
			required: ['name', 'type', 'category', 'link'],
			properties: {
				icon: {
					type: 'string',
				},
				category: {
					type: 'integer',
				},
				type: {
					type: 'integer',
				},
				link: {
					type: 'string',
				},
				tags: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				name: {
					type: 'string',
					minLength: 1,
					maxLennth: 20,
				},
			},
		},
	},
};

export class DappTransaction extends BaseTransaction {
	public readonly containsUniqueData = true;
	public readonly asset: DappAsset;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(dappAssetTypeSchema, tx.asset);
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
		this.asset = tx.asset as DappAsset;
	}

	public static create(input: CreateDappInput): object {
		const { passphrase, secondPassphrase, options } = input;

		const transaction = {
			...createBaseTransaction(input),
			type: 5,
			fee: DAPP_FEE.toString(),
			asset: {
				dapp: options,
			},
		};

		if (!passphrase) {
			return transaction;
		}

		const {
			address: senderId,
			publicKey: senderPublicKey,
		} = getAddressAndPublicKeyFromPassphrase(passphrase);
		const transactionWithSenderInfo = {
			...transaction,
			senderId,
			senderPublicKey,
			recipientId: senderId,
		};

		const dappTransaction = new DappTransaction(transactionWithSenderInfo);
		dappTransaction.sign(passphrase, secondPassphrase);

		return dappTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): DappTransaction {
		const transaction = new DappTransaction(tx);
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
		const DAPP_TYPE_LENGTH = 4;
		const DAPP_CATEGORY_LENGTH = 4;
		const {
			name,
			description,
			tags,
			link,
			icon,
			type,
			category,
		} = this.asset.dapp;
		const nameBuffer = Buffer.from(name, 'utf8');
		const linkBuffer = Buffer.from(link, 'utf8');
		const typeBuffer = Buffer.alloc(DAPP_TYPE_LENGTH);
		typeBuffer.writeIntLE(type, 0, DAPP_TYPE_LENGTH);
		const categoryBuffer = Buffer.alloc(DAPP_CATEGORY_LENGTH);
		categoryBuffer.writeIntLE(category, 0, DAPP_CATEGORY_LENGTH);

		const descriptionBuffer = description
			? Buffer.from(description, 'utf8')
			: Buffer.alloc(0);
		const tagsBuffer = tags ? Buffer.from(tags, 'utf8') : Buffer.alloc(0);
		const iconBuffer = icon ? Buffer.from(icon, 'utf8') : Buffer.alloc(0);

		return Buffer.concat([
			nameBuffer,
			descriptionBuffer,
			tagsBuffer,
			linkBuffer,
			iconBuffer,
			typeBuffer,
			categoryBuffer,
		]);
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();

		return {
			...attr,
			[ENTITY_TRANSACTION]: {
				dappName: [this.asset.dapp.name],
			},
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const sameTypeTransactions = transactions
			.filter(tx => tx.type === this.type)
			.map(tx => new DappTransaction(tx));

		const errors =
			sameTypeTransactions.filter(
				tx => tx.asset.dapp.name === this.asset.dapp.name,
			).length > 0
				? [
						new TransactionError(
							'Dapp with the same name already exists.',
							this.id,
							'.asset.dapp.name',
						),
				  ]
				: [];

		return {
			id: this.id,
			errors,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
		};
	}

	public processRequiredState(state: EntityMap): RequiredDappState {
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'publicKey'])
		) {
			throw new Error('Required state does not have valid account type.');
		}

		const sender = accounts.find(acct => acct.address === this.senderId);
		if (!sender) {
			throw new Error('No sender account is found.');
		}

		// In valid case, transaction should not exist
		const dapps = state[ENTITY_TRANSACTION];
		if (!dapps) {
			return {
				sender,
				dependentState: {
					[ENTITY_TRANSACTION]: [],
				},
			};
		}
		if (
			!isTypedObjectArrayWithKeys<TransactionJSON>(dapps, [
				'id',
				'type',
				'asset',
			])
		) {
			throw new Error('Required state does not have valid dapp type.');
		}

		const dependentDappTx = dapps.filter(
			tx =>
				tx.type === this.type &&
				tx.asset &&
				'dapp' in tx.asset &&
				tx.asset.dapp.name === this.asset.dapp.name,
		);

		return {
			sender,
			dependentState: {
				[ENTITY_TRANSACTION]: dependentDappTx,
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { errors: baseErrors, status } = super.validateSchema();
		const valid = validator.validate(dappAssetFormatSchema, this.asset);
		const errors = [...baseErrors];
		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for dapp transaction',
					this.id,
					'.amount',
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
	}: RequiredDappState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		if (!dependentState) {
			throw new Error('Dependent state is required for vote transaction.');
		}
		const errors = [...baseErrors];
		const dependentDappsTxs = dependentState[ENTITY_TRANSACTION];
		if (dependentDappsTxs.length > 0) {
			errors.push(
				new TransactionError(
					`${this.asset.dapp.name} already exists.`,
					this.id,
				),
			);
		}

		return {
			id: this.id,
			status: dependentDappsTxs.length === 0 ? Status.OK : Status.FAIL,
			errors:
				dependentDappsTxs.length === 0
					? []
					: [
							new TransactionError(
								`${this.asset.dapp.name} already exists.`,
								this.id,
							),
					  ],
		};
	}
}
