/*
 * Copyright © 2020 Lisk Foundation
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
 */

import { codec } from '@liskhq/lisk-codec';
import { ApplyAssetInput, BaseAsset, StateStore, ValidateAssetInput } from '../../base_asset';
import { FrameworkError, ValidationError } from '../../../errors';
import { CHAIN_STATE_DELEGATE_USERNAMES, DELEGATE_NAME_FEE } from '../constants';

const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp(/\\0|\\u0000|\\x00/).test(input);

const isUsername = (username: string): boolean => {
	if (isNullCharacterIncluded(username)) {
		return false;
	}

	if (username !== username.trim().toLowerCase()) {
		return false;
	}

	if (/^[0-9]{1,21}[L|l]$/g.test(username)) {
		return false;
	}

	return /^[a-z0-9!@$&_.]+$/g.test(username);
};

const delegatesUserNamesSchema = {
	$id: '/dpos/userNames',
	type: 'object',
	properties: {
		registeredDelegates: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['username', 'address'],
				properties: {
					username: {
						dataType: 'string',
						fieldNumber: 1,
					},
					address: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
	required: ['registeredDelegates'],
};

interface RegisteredDelegate {
	readonly username: string;
	readonly address: Buffer;
}

interface RegisteredDelegates {
	registeredDelegates: RegisteredDelegate[];
}
interface DelegatePersistedUsernames {
	readonly registeredDelegates: RegisteredDelegate[];
}

export interface RegisterTransactionAssetInput {
	readonly username: string;
}

const getRegisteredDelegates = async (store: StateStore): Promise<DelegatePersistedUsernames> => {
	const usernamesBuffer = await store.chain.get(CHAIN_STATE_DELEGATE_USERNAMES);
	if (!usernamesBuffer) {
		return { registeredDelegates: [] };
	}
	const parsedUsernames = codec.decode<RegisteredDelegates>(
		delegatesUserNamesSchema,
		usernamesBuffer,
	);

	parsedUsernames.registeredDelegates = parsedUsernames.registeredDelegates.map(
		(value: { address: Buffer; username: string }) => ({
			username: value.username,
			address: value.address,
		}),
	);

	return parsedUsernames as DelegatePersistedUsernames;
};

export class RegisterTransactionAsset extends BaseAsset<RegisterTransactionAssetInput> {
	public baseFee = DELEGATE_NAME_FEE;
	public name = 'register';
	public type = 0;
	public assetSchema = {
		$id: 'lisk/dpos/register',
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

	// eslint-disable-next-line class-methods-use-this
	public validateAsset({ asset }: ValidateAssetInput<RegisterTransactionAssetInput>): void {
		if (!isUsername(asset.username)) {
			throw new ValidationError('The username is in unsupported format', asset.username);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	public async applyAsset({
		asset,
		senderID,
		stateStore,
	}: ApplyAssetInput<RegisterTransactionAssetInput>): Promise<void> {
		const sender = await stateStore.account.get<{
			dpos: { delegate: { username: string; lastForgedHeight: number } };
		}>(senderID);

		if (sender.dpos.delegate.username) {
			throw new FrameworkError('Account is already a delegate');
		}

		const usernames = await getRegisteredDelegates(stateStore);
		const usernameExists = usernames.registeredDelegates.find(
			delegate => delegate.username === asset.username,
		);

		if (!usernameExists) {
			usernames.registeredDelegates.push({
				username: asset.username,
				address: senderID,
			});

			usernames.registeredDelegates.sort((a, b) => a.address.compare(b.address));

			stateStore.chain.set(
				CHAIN_STATE_DELEGATE_USERNAMES,
				codec.encode(delegatesUserNamesSchema, usernames),
			);
		}

		if (usernameExists) {
			throw new FrameworkError('Username is not unique');
		}

		sender.dpos.delegate.username = asset.username;
		sender.dpos.delegate.lastForgedHeight = stateStore.chain.lastBlockHeaders[0].height + 1;
		stateStore.account.set(sender.address, sender);
	}
}
