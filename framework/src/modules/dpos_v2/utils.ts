/*
 * Copyright © 2021 Lisk Foundation
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

import { verifyData } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-chain';
import { UnlockingObject, VoterData } from './types';
import { PUNISHMENT_PERIOD, WAIT_TIME_SELF_VOTE, WAIT_TIME_VOTE } from './constants';
import { SubStore } from '../../node/state_machine/types';
import { voterStoreSchema } from './schemas';

export const sortUnlocking = (unlocks: UnlockingObject[]): void => {
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

export const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp(/\\0|\\u0000|\\x00/).test(input);

export const isUsername = (username: string): boolean => {
	if (isNullCharacterIncluded(username)) {
		return false;
	}

	if (username !== username.trim().toLowerCase()) {
		return false;
	}

	return /^[a-z0-9!@$&_.]+$/g.test(username);
};

export const validateSignature = (
	tag: string,
	networkIdentifier: Buffer,
	publicKey: Buffer,
	signature: Buffer,
	bytes: Buffer,
): boolean => verifyData(tag, networkIdentifier, bytes, signature, publicKey);

export const getVoterOrDefault = async (voterStore: SubStore, address: Buffer) => {
	try {
		const voterData = await voterStore.getWithSchema<VoterData>(address, voterStoreSchema);
		return voterData;
	} catch (error) {
		if (!(error instanceof NotFoundError)) {
			throw error;
		}

		const voterData = {
			sentVotes: [],
			pendingUnlocks: [],
		};
		return voterData;
	}
};

export const hasWaited = (
	unlockingObject: UnlockingObject,
	senderAddress: Buffer,
	height: number,
) => {
	let delayedAvailability: number;

	// If self-vote
	if (unlockingObject.delegateAddress.equals(senderAddress)) {
		delayedAvailability = 260000;
	} else {
		delayedAvailability = 2000;
	}

	return !(height - unlockingObject.unvoteHeight < delayedAvailability);
};

export const isPunished = (
	unlockingObject: UnlockingObject,
	pomHeights: ReadonlyArray<number>,
	senderAddress: Buffer,
	height: number,
) => {
	if (!pomHeights.length) {
		return false;
	}

	const lastPomHeight = pomHeights[pomHeights.length - 1];

	// If self-vote
	if (unlockingObject.delegateAddress.equals(senderAddress)) {
		return (
			height - lastPomHeight < PUNISHMENT_PERIOD &&
			lastPomHeight < unlockingObject.unvoteHeight + WAIT_TIME_SELF_VOTE
		);
	}

	return (
		height - lastPomHeight < WAIT_TIME_SELF_VOTE &&
		lastPomHeight < unlockingObject.unvoteHeight + WAIT_TIME_VOTE
	);
};
