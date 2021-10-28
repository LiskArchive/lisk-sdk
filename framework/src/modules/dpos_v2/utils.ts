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
import {
	PUNISHMENT_PERIOD,
	SELF_VOTE_PUNISH_TIME,
	VOTER_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
} from './constants';
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

export const getMinPunishedHeight = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	pomHeights: number[],
): number => {
	if (pomHeights.length === 0) {
		return 0;
	}

	const lastPomHeight = Math.max(...pomHeights);

	// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0024.md#update-to-validity-of-unlock-transaction
	return senderAddress.equals(delegateAddress)
		? lastPomHeight + SELF_VOTE_PUNISH_TIME
		: lastPomHeight + VOTER_PUNISH_TIME;
};

export const getPunishmentPeriod = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	pomHeights: number[],
	lastBlockHeight: number,
): number => {
	const currentHeight = lastBlockHeight + 1;
	const minPunishedHeight = getMinPunishedHeight(senderAddress, delegateAddress, pomHeights);
	const remainingBlocks = minPunishedHeight - currentHeight;

	return remainingBlocks < 0 ? 0 : remainingBlocks;
};

export const getMinWaitingHeight = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	unlockObject: UnlockingObject,
): number =>
	unlockObject.unvoteHeight +
	(senderAddress.equals(delegateAddress) ? WAIT_TIME_SELF_VOTE : WAIT_TIME_VOTE);

export const getWaitingPeriod = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	lastBlockHeight: number,
	unlockObject: UnlockingObject,
): number => {
	const currentHeight = lastBlockHeight + 1;
	const minWaitingHeight = getMinWaitingHeight(senderAddress, delegateAddress, unlockObject);
	const remainingBlocks = minWaitingHeight - currentHeight;

	return remainingBlocks < 0 ? 0 : remainingBlocks;
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
