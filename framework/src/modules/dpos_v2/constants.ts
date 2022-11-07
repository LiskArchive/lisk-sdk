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
export const MODULE_NAME_DPOS = 'dpos';

export const COMMAND_NAME_DELEGATE_REGISTRATION = 'registerDelegate';

export const WAIT_TIME_VOTE = 2000;
export const WAIT_TIME_SELF_VOTE = 260000;
export const VOTER_PUNISH_TIME = 260000;
export const SELF_VOTE_PUNISH_TIME = 780000;
// Punishment period is 780k block height by default
export const PUNISHMENT_PERIOD = 780000;
export const MAX_LENGTH_NAME = 20;
export const TEN_UNIT = BigInt(10) * BigInt(10) ** BigInt(8);
export const MAX_VOTE = 10;
export const MAX_UNLOCKING = 20;
export const TOKEN_ID_DPOS = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
export const TOKEN_ID_FEE = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
export const DELEGATE_REGISTRATION_FEE = BigInt(10) * BigInt(10) ** BigInt(8);
export const MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE = 260000;
export const MAX_POM_HEIGHTS = 5;
export const REPORTING_PUNISHMENT_REWARD = BigInt(100000000);
export const DELEGATE_LIST_ROUND_OFFSET = 2;
export const EMPTY_KEY = Buffer.alloc(0);
export const MAX_SNAPSHOT = 3;
export const CHAIN_ID_LENGTH = 4;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;
export const MAX_NUMBER_BYTES_Q96 = 24;
export const COMMISSION = 10000;

// Key length
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const BLS_POP_LENGTH = 96;
export const MAX_CAP = 10000;
export const MAX_COMMISSION = 10000;

export const defaultConfig = {
	factorSelfVotes: 10,
	maxLengthName: 20,
	maxNumberSentVotes: 10,
	maxNumberPendingUnlocks: 20,
	failSafeMissedBlocks: 50,
	failSafeInactiveWindow: 260000,
	punishmentWindow: PUNISHMENT_PERIOD,
	roundLength: 103,
	minWeightStandby: '100000000000',
	numberActiveDelegates: 101,
	numberStandbyDelegates: 2,
	tokenIDFee: TOKEN_ID_FEE.toString('hex'),
	delegateRegistrationFee: DELEGATE_REGISTRATION_FEE.toString(),
	maxBFTWeightCap: 500,
};

export const enum PoSEventResult {
	SUCCESSFUL = 0,
	FAIL_INSUFFICIENT_BALANCE = 1,
	FAIL_RECIPIENT_NOT_INITIALIZED = 2,
}
