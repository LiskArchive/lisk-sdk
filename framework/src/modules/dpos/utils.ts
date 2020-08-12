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
import { verifyData } from '@liskhq/lisk-cryptography';
import { Account } from '@liskhq/lisk-chain';
import {
	DelegatePersistedUsernames,
	DPOSAccountProps,
	RegisteredDelegates,
	UnlockingAccountAsset,
} from './types';
import {
	CHAIN_STATE_DELEGATE_USERNAMES,
	SELF_VOTE_PUNISH_TIME,
	VOTER_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
} from './constants';
import { StateStore } from '../../types';

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

export const sortUnlocking = (unlocks: UnlockingAccountAsset[]): void => {
	unlocks.sort((a, b) => {
		if (!a.delegateAddress.equals(b.delegateAddress)) {
			return a.delegateAddress.compare(b.delegateAddress);
		}
		if (a.unvoteHeight !== b.unvoteHeight) {
			return b.unvoteHeight - a.unvoteHeight;
		}
		const diff = b.amount - a.amount;
		if (diff > BigInt(0)) {
			return 1;
		}
		if (diff < BigInt(0)) {
			return -1;
		}

		return 0;
	});
};

export const getPunishmentPeriod = (
	sender: Account<DPOSAccountProps>,
	delegateAccount: Account<DPOSAccountProps>,
	lastBlockHeight: number,
): number => {
	if (delegateAccount.dpos.delegate.pomHeights.length === 0) {
		return 0;
	}
	const lastPomHeight = Math.max(...delegateAccount.dpos.delegate.pomHeights);
	const currentHeight = lastBlockHeight + 1;
	const punishTime = sender.address.equals(delegateAccount.address)
		? SELF_VOTE_PUNISH_TIME
		: VOTER_PUNISH_TIME;

	return punishTime - (currentHeight - lastPomHeight);
};

export const getWaitingPeriod = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	lastBlockHeight: number,
	unlockObject: UnlockingAccountAsset,
): number => {
	const currentHeight = lastBlockHeight + 1;
	const waitTime = senderAddress.equals(delegateAddress) ? WAIT_TIME_SELF_VOTE : WAIT_TIME_VOTE;

	return waitTime - (currentHeight - unlockObject.unvoteHeight);
};

export const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp(/\\0|\\u0000|\\x00/).test(input);

export const isUsername = (username: string): boolean => {
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

export const validateSignature = (publicKey: Buffer, signature: Buffer, bytes: Buffer): boolean =>
	verifyData(bytes, signature, publicKey);
