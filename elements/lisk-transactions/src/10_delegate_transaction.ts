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

import { BaseTransaction, StateStore } from './base_transaction';
import { CHAIN_STATE_DELEGATE_USERNAMES, DELEGATE_NAME_FEE } from './constants';
import { TransactionError } from './errors';
import { BaseTransactionInput, AccountAsset } from './types';

interface RegisteredDelegate {
	readonly username: string;
	readonly address: Buffer;
}
interface ChainUsernames {
	readonly registeredDelegates: RegisteredDelegate[];
}

export interface DelegateAsset {
	readonly username: string;
}

export const delegateRegistrationAssetSchema = {
	$id: 'lisk/delegate-registration-transaction',
	type: 'object',
	required: ['username'],
	properties: {
		username: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: 1,
			maxLength: 20,
		},
	},
};

export class DelegateTransaction extends BaseTransaction {
	public static TYPE = 10;
	public static NAME_FEE = BigInt(DELEGATE_NAME_FEE);
	public static ASSET_SCHEMA = delegateRegistrationAssetSchema;
	public readonly asset: DelegateAsset;

	public constructor(transaction: BaseTransactionInput<DelegateAsset>) {
		super(transaction);

		this.asset = transaction.asset;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get<AccountAsset>(this.senderId);

		// Data format for the registered delegates
		// chain:delegateUsernames => { registeredDelegates: { username, address }[] }
		// TODO: Use lisk-codec to save this data
		const usernames = await this._getRegisteredDelegates(store);
		const usernameExists = usernames.registeredDelegates.find(
			delegate => delegate.username === this.asset.username,
		);

		if (!usernameExists) {
			usernames.registeredDelegates.push({
				username: this.asset.username,
				address: this.senderId,
			});
			usernames.registeredDelegates.sort((a, b) =>
				a.address.compare(b.address),
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
		if (sender.asset.delegate.username) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.asset.username',
				),
			);
		}
		sender.asset.delegate.username = this.asset.username;
		store.account.set(sender.address, sender);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const sender = await store.account.get<AccountAsset>(this.senderId);

		// Data format for the registered delegates
		// chain:delegateUsernames => { registeredDelegates: { username, address }[] }
		const usernames = await this._getRegisteredDelegates(store);
		const updatedRegisteredDelegates = {
			registeredDelegates: usernames.registeredDelegates.filter(
				delegate => delegate.username !== sender.asset.delegate.username,
			),
		};
		updatedRegisteredDelegates.registeredDelegates.sort((a, b) =>
			a.address.compare(b.address),
		);
		this._setRegisteredDelegates(store, updatedRegisteredDelegates);

		sender.asset.delegate.username = '';
		store.account.set(sender.address, sender);
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	private async _getRegisteredDelegates(store: StateStore): Promise<ChainUsernames> {
		const usernamesBuffer = await store.chain.get(
			CHAIN_STATE_DELEGATE_USERNAMES,
		);
		if (!usernamesBuffer) {
			return { registeredDelegates: [] };
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const parsedUsernames = JSON.parse(usernamesBuffer.toString('utf8'));
		// eslint-disable-next-line
		parsedUsernames.registeredDelegates = parsedUsernames.registeredDelegates.map((value: { address: string, username: string }) => ({
			username: value.username,
			address: Buffer.from(value.address, 'binary'),
		}));

		return parsedUsernames as ChainUsernames;
	}

	// eslint-disable-next-line class-methods-use-this
	private _setRegisteredDelegates(store: StateStore, input: ChainUsernames): void {
		const updatingObject = Buffer.from(JSON.stringify({
			registeredDelegates: input.registeredDelegates.map(value => ({ address: value.address.toString('binary'), username: value.username })),
		}), 'utf8');
		store.chain.set(
			CHAIN_STATE_DELEGATE_USERNAMES,
			updatingObject,
		);
	}
}
