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
import { DAPP_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { TransactionJSON } from '../transaction_types';
import { CreateBaseTransactionInput } from '../utils';
import { stringEndsWith, validator } from '../utils/validation';
import { BaseTransaction, StateStore, StateStorePrepare } from './base';

const TRANSACTION_DAPP_TYPE = 5;

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
	public readonly containsUniqueData: boolean;
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
		this.containsUniqueData = true;
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

	public async prepareTransaction(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
		]);

		await store.transaction.cache([
			{
				dapp_name: this.asset.dapp.name,
			},
			{ dapp_link: this.asset.dapp.link },
		]);
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
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

		return errors;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(dappAssetFormatSchema, this.asset);
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

		if (this.type !== TRANSACTION_DAPP_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for vote transaction',
					this.id,
					'.amount',
				),
			);
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

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const nameExists = store.transaction.find(
			(transaction: TransactionJSON) =>
				transaction.type === TRANSACTION_DAPP_TYPE &&
				(transaction.asset as DappAsset).dapp &&
				(transaction.asset as DappAsset).dapp.name === this.asset.dapp.name,
		);

		if (nameExists) {
			errors.push(
				new TransactionError(
					`Application name already exists: ${this.asset.dapp.name}`,
					this.id,
				),
			);
		}

		const linkExists = store.transaction.find(
			(transaction: TransactionJSON) =>
				transaction.type === TRANSACTION_DAPP_TYPE &&
				(transaction.asset as DappAsset).dapp &&
				(transaction.asset as DappAsset).dapp.link === this.asset.dapp.link,
		);

		if (linkExists) {
			errors.push(
				new TransactionError(
					`Application link already exists: ${this.asset.dapp.link}`,
					this.id,
				),
			);
		}

		return errors;
	}

	// tslint:disable-next-line prefer-function-over-method
	protected undoAsset(_: StateStore): ReadonlyArray<TransactionError> {
		return [];
	}
}
