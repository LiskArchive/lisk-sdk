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
import { validator } from '@liskhq/lisk-validator';

import { BaseTransaction, StateStore } from './base_transaction';
import { CHAIN_STATE_DELEGATE_USERNAMES, DELEGATE_NAME_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './types';

interface RegisteredDelegate {
	readonly username: string;
	readonly address: string;
}
interface ChainUsernames {
	readonly registeredDelegates: RegisteredDelegate[];
}

export interface DelegateAsset {
	readonly username: string;
}

export const delegateRegistrationAssetSchema = {
	type: 'object',
	required: ['username'],
	properties: {
		username: {
			dataType: 'string',
			fieldNumber: 1,
		},
	},
};

export class DelegateTransaction extends BaseTransaction {
	public static TYPE = 10;
	public static NAME_FEE = BigInt(DELEGATE_NAME_FEE);
	public readonly asset: DelegateAsset;
	public readonly assetSchema: object;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);

		this.assetSchema = delegateRegistrationAssetSchema;
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset ?? { delegate: {} }) as DelegateAsset;
	}

	protected assetToBytes(): Buffer {
		const { username } = this.asset;

		return Buffer.from(username, 'utf8');
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return transactions
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
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const schemaErrors = validator.validate(
			delegateRegistrationAssetSchema,
			this.asset,
		);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		return errors;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get(this.senderId);

		// Data format for the registered delegates
		// chain:delegateUsernames => { registeredDelegates: { username, address }[] }
		const usernamesBuffer = await store.chain.get(
			CHAIN_STATE_DELEGATE_USERNAMES,
		);
		const usernames = usernamesBuffer
			? (JSON.parse(usernamesBuffer.toString('utf8')) as ChainUsernames)
			: { registeredDelegates: [] };
		const usernameExists = usernames.registeredDelegates.find(
			delegate => delegate.username === this.asset.username,
		);

		if (!usernameExists) {
			usernames.registeredDelegates.push({
				username: this.asset.username,
				address: this.senderId,
			});
			usernames.registeredDelegates.sort((a, b) =>
				a.address.localeCompare(b.address),
			);
			store.chain.set(
				CHAIN_STATE_DELEGATE_USERNAMES,
				Buffer.from(JSON.stringify(usernames), 'utf8'),
			);
		}

		if (usernameExists) {
			errors.push(
				new TransactionError(
					`Username is not unique.`,
					this.id,
					'.asset.username',
				),
			);
		}
		if (sender.isDelegate || sender.username) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.asset.username',
				),
			);
		}
		sender.username = this.asset.username;
		sender.isDelegate = 1;
		store.account.set(sender.address, sender);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const sender = await store.account.get(this.senderId);

		// Data format for the registered delegates
		// chain:delegateUsernames => { registeredDelegates: { username, address }[] }
		const usernamesBuffer = await store.chain.get(
			CHAIN_STATE_DELEGATE_USERNAMES,
		);
		const usernames = usernamesBuffer
			? (JSON.parse(usernamesBuffer.toString('utf8')) as ChainUsernames)
			: { registeredDelegates: [] };
		const updatedRegisteredDelegates = {
			registeredDelegates: usernames.registeredDelegates.filter(
				delegate => delegate.username !== sender.username,
			),
		};
		updatedRegisteredDelegates.registeredDelegates.sort((a, b) =>
			a.address.localeCompare(b.address),
		);
		store.chain.set(
			CHAIN_STATE_DELEGATE_USERNAMES,
			Buffer.from(JSON.stringify(updatedRegisteredDelegates), 'utf8'),
		);

		sender.username = null;
		sender.isDelegate = 0;
		store.account.set(sender.address, sender);
		return [];
	}
}
