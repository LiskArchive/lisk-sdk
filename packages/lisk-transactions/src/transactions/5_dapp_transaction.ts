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
import { DAPP_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import {
	isTypedObjectArrayWithKeys,
	stringEndsWith,
	validator,
} from '../utils/validation';
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

const TRANSACTION_DAPP_TYPE = 5;

export interface DappAsset {
	readonly dapp: {
		readonly category: number;
		readonly description?: string;
		readonly icon?: string;
		readonly link?: string;
		readonly name: string;
		readonly tags?: string;
		readonly type: number;
	};
}

export interface DappOptions {
	readonly category: number;
	readonly description?: string;
	readonly icon?: string;
	readonly link?: string;
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
			required: ['name', 'type', 'category'],
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
			required: ['name', 'type', 'category'],
			properties: {
				icon: {
					type: 'string',
					format: 'uri',
					maxLength: 2000,
				},
				category: {
					type: 'integer',
					minimum: 0,
					maximum: 8,
				},
				type: {
					type: 'integer',
					minimum: 0,
					maximum: 0,
				},
				link: {
					type: 'string',
					format: 'uri',
					minLength: 0,
					maxLength: 2000,
				},
				tags: {
					type: 'string',
					maxLength: 160,
				},
				description: {
					type: 'string',
					maxLength: 160,
				},
				name: {
					type: 'string',
					minLength: 1,
					maxLength: 32,
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
			throw new TransactionMultiError('Invalid field types.', tx.id, errors);
		}
		this.asset = tx.asset as DappAsset;
		this._fee = new BigNum(DAPP_FEE);
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

		const transactionWithSenderInfo = {
			...transaction,
			senderId: transaction.senderId as string,
			senderPublicKey: transaction.senderPublicKey as string,
		};

		const dappTransaction = new DappTransaction(transactionWithSenderInfo);
		dappTransaction.sign(passphrase, secondPassphrase);

		return dappTransaction.toJSON();
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
		const linkBuffer = link ? Buffer.from(link, 'utf8') : Buffer.alloc(0);
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
		const filterObject = {
			dappName: [this.asset.dapp.name],
		};
		const uniqueFields = this.asset.dapp.link
			? {
					...filterObject,
					dappLink: [this.asset.dapp.link],
			  }
			: filterObject;

		return {
			...attr,
			[ENTITY_TRANSACTION]: uniqueFields,
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const sameTypeTransactions = transactions.filter(
			tx => tx.type === this.type,
		);

		const errors =
			sameTypeTransactions.filter(
				tx => 'dapp' in tx.asset && tx.asset.dapp.name === this.asset.dapp.name,
			).length > 0
				? [
						new TransactionError(
							'Dapp with the same name already exists.',
							this.id,
							'.asset.dapp.name',
						),
				  ]
				: [];
		if (
			sameTypeTransactions.filter(
				tx =>
					'dapp' in tx.asset &&
					this.asset.dapp.link &&
					this.asset.dapp.link === tx.asset.dapp.link,
			).length > 0
		) {
			errors.push(
				new TransactionError(
					'Dapp with the same link already exists.',
					this.id,
					'.asset.dapp.link',
				),
			);
		}

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
			throw new Error('Required state does not have valid transaction type.');
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
							`.asset${error.dataPath}`,
						),
			  )
			: [];
		errors.push(...assetErrors);

		if (this.type !== TRANSACTION_DAPP_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (this.recipientId) {
			errors.push(
				new TransactionError(`Invalid recipient id`, this.id, '.recipientId'),
			);
		}

		if (!this.fee.eq(DAPP_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${DAPP_FEE}`,
					this.id,
					'.fee',
				),
			);
		}
		const validLinkSuffix = ['.zip'];
		if (
			this.asset.dapp.link &&
			!stringEndsWith(this.asset.dapp.link, validLinkSuffix)
		) {
			errors.push(
				new TransactionError(
					`Dapp icon must have suffix ${validLinkSuffix.toString()}`,
					this.id,
					'.asset.dapp.link',
				),
			);
		}

		const validIconSuffix = ['.png', '.jpeg', '.jpg'];
		if (
			this.asset.dapp.icon &&
			!stringEndsWith(this.asset.dapp.icon, validIconSuffix)
		) {
			errors.push(
				new TransactionError(
					`Dapp icon must have suffix of one of ${validIconSuffix.toString()}`,
					this.id,
					'.asset.dapp.icon',
				),
			);
		}

		if (this.asset.dapp.tags) {
			const tags = this.asset.dapp.tags
				.split(',')
				.map(tag => tag.trim())
				.sort();
			if (tags.length !== new Set(tags).size) {
				errors.push(
					new TransactionError(
						`Dapp tags must have unique set`,
						this.id,
						'.asset.dapp.tags',
					),
				);
			}
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
	}: RequiredDappState): TransactionResponse {
		const { errors: baseErrors } = super.verify({ sender });
		if (!dependentState) {
			throw new Error('Dependent state is required for dapp transaction.');
		}
		if (!dependentState[ENTITY_TRANSACTION]) {
			throw new Error(
				'Dependent transaction state is required for dapp transaction.',
			);
		}

		const errors = [...baseErrors];
		const dependentDappsTxs = dependentState[ENTITY_TRANSACTION].filter(
			tx =>
				tx.type === this.type &&
				tx.asset &&
				'dapp' in tx.asset &&
				tx.asset.dapp.name === this.asset.dapp.name,
		);

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
