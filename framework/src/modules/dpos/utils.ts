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
import { StateStore } from '../base_asset';
import { DelegatePersistedUsernames, RegisteredDelegates } from './types';
import { CHAIN_STATE_DELEGATE_USERNAMES } from './constants';

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

export const getRegisteredDelegates = async (
	store: StateStore,
): Promise<DelegatePersistedUsernames> => {
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

export const setRegisteredDelegates = (
	store: StateStore,
	usernames: DelegatePersistedUsernames,
): void => {
	usernames.registeredDelegates.sort((a, b) => a.address.compare(b.address));

	store.chain.set(
		CHAIN_STATE_DELEGATE_USERNAMES,
		codec.encode(delegatesUserNamesSchema, usernames),
	);
};
