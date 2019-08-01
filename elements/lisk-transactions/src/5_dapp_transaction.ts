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
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { DAPP_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { stringEndsWith, validator } from './utils/validation';

export interface DappAsset {
	readonly dapp: {
		readonly category: number;
		readonly link: string;
		readonly name: string;
		readonly type: number;
		// tslint:disable-next-line readonly-keyword
		description?: string;
		// tslint:disable-next-line readonly-keyword
		icon?: string;
		// tslint:disable-next-line readonly-keyword
		tags?: string;
	};
}

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
					maximum: 1,
				},
				link: {
					type: 'string',
					format: 'uri',
					minLength: 0,
					maxLength: 2000,
				},
				tags: {
					type: 'string',
					format: 'noNullByte',
					maxLength: 160,
				},
				description: {
					type: 'string',
					format: 'noNullByte',
					maxLength: 160,
				},
				name: {
					type: 'string',
					format: 'noNullByte',
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
	public static TYPE = 5;
	public static FEE = DAPP_FEE.toString();

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset || { dapp: {} }) as DappAsset;
		this.containsUniqueData = true;
		if (this.asset && this.asset.dapp && typeof this.asset.dapp === 'object') {
			// If Optional field contains null, converts to undefined
			this.asset.dapp.description = this.asset.dapp.description || undefined;
			this.asset.dapp.icon = this.asset.dapp.icon || undefined;
			this.asset.dapp.tags = this.asset.dapp.tags || undefined;
		}
	}

	protected assetToBytes(): Buffer {
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

	public async prepare(store: StateStorePrepare): Promise<void> {
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
				tx =>
					'dapp' in tx.asset &&
					(tx.asset as DappAsset).dapp.name === this.asset.dapp.name,
			).length > 0
				? [
						new TransactionError(
							'Dapp with the same name already exists.',
							this.id,
							'.asset.dapp.name',
							this.asset.dapp.name,
						),
				  ]
				: [];
		if (
			sameTypeTransactions.filter(
				tx =>
					'dapp' in tx.asset &&
					this.asset.dapp.link &&
					this.asset.dapp.link === (tx.asset as DappAsset).dapp.link,
			).length > 0
		) {
			errors.push(
				new TransactionError(
					'Dapp with the same link already exists.',
					this.id,
					'.asset.dapp.link',
					this.asset.dapp.link,
				),
			);
		}

		return errors;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(dappAssetFormatSchema, this.asset);
		const errors = convertToAssetError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for dapp transaction',
					this.id,
					'.amount',
					this.amount.toString(),
					'0',
				),
			);
		}

		if (this.recipientId) {
			errors.push(
				new TransactionError(
					`RecipientId is expected to be undefined`,
					this.id,
					'.recipientId',
				),
			);
		}

		const validLinkSuffix = ['.zip'];

		if (errors.length > 0) {
			return errors;
		}

		if (
			this.asset.dapp.link &&
			!stringEndsWith(this.asset.dapp.link, validLinkSuffix)
		) {
			errors.push(
				new TransactionError(
					`Dapp icon must have suffix ${validLinkSuffix.toString()}`,
					this.id,
					'.asset.dapp.link',
					this.asset.dapp.link,
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
					this.asset.dapp.icon,
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
						this.asset.dapp.tags,
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
				transaction.type === DappTransaction.TYPE &&
				transaction.id !== this.id &&
				(transaction.asset as DappAsset).dapp &&
				(transaction.asset as DappAsset).dapp.name === this.asset.dapp.name,
		);

		if (nameExists) {
			errors.push(
				new TransactionError(
					`Application name already exists: ${this.asset.dapp.name}`,
					this.id,
					this.asset.dapp.name,
				),
			);
		}

		const linkExists = store.transaction.find(
			(transaction: TransactionJSON) =>
				transaction.type === DappTransaction.TYPE &&
				transaction.id !== this.id &&
				(transaction.asset as DappAsset).dapp &&
				(transaction.asset as DappAsset).dapp.link === this.asset.dapp.link,
		);

		if (linkExists) {
			errors.push(
				new TransactionError(
					`Application link already exists: ${this.asset.dapp.link}`,
					this.id,
					this.asset.dapp.link,
				),
			);
		}

		return errors;
	}

	// tslint:disable-next-line prefer-function-over-method
	protected undoAsset(_: StateStore): ReadonlyArray<TransactionError> {
		return [];
	}

	// tslint:disable:next-line: prefer-function-over-method no-any
	protected assetFromSync(raw: any): object | undefined {
		if (!raw.dapp_name) {
			return undefined;
		}
		const dapp = {
			name: raw.dapp_name,
			description: raw.dapp_description,
			tags: raw.dapp_tags,
			type: raw.dapp_type,
			link: raw.dapp_link,
			category: raw.dapp_category,
			icon: raw.dapp_icon,
		};

		return { dapp };
	}
}
