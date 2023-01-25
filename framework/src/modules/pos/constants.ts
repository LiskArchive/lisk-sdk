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
export const MODULE_NAME_POS = 'pos';

export const COMMAND_NAME_VALIDATOR_REGISTRATION = 'registerValidator';

export const LOCKING_PERIOD_STAKING = 26000;
export const LOCKING_PERIOD_SELF_STAKING = 260000;
export const PUNISHMENT_WINDOW_STAKING = 260000;
export const PUNISHMENT_WINDOW_SELF_STAKING = 780000;
// Punishment period is 780k block height by default
export const PUNISHMENT_PERIOD = 780000;
export const MAX_LENGTH_NAME = 20;
export const BASE_STAKE_AMOUNT = BigInt(10) * BigInt(10) ** BigInt(8);
export const MAX_NUMBER_SENT_STAKES = 10;
export const MAX_NUMBER_PENDING_UNLOCKS = 20;
export const TOKEN_ID_POS = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
export const VALIDATOR_REGISTRATION_FEE = BigInt(10) * BigInt(10) ** BigInt(8);
export const MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE = 260000;
export const REPORT_MISBEHAVIOR_LIMIT_BANNED = 5;
export const REPORTING_PUNISHMENT_REWARD = BigInt(100000000);
export const VALIDATOR_LIST_ROUND_OFFSET = 2;
export const EMPTY_KEY = Buffer.alloc(0);
export const MAX_SNAPSHOT = 3;
export const CHAIN_ID_LENGTH = 4;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;
export const MAX_NUMBER_BYTES_Q96 = 24;
export const COMMISSION = 10000;
export const COMMISSION_INCREASE_PERIOD = 260000;
export const MAX_COMMISSION_INCREASE_RATE = 500;

// Key length
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const BLS_POP_LENGTH = 96;
export const MAX_CAP = 10000;
export const MAX_COMMISSION = 10000;
export const MIN_WEIGHT = BigInt(1000) * BigInt(10) ** BigInt(8);

export const defaultConfig = {
	factorSelfStakes: 10,
	maxLengthName: 20,
	maxNumberSentStakes: 10,
	maxNumberPendingUnlocks: 20,
	failSafeMissedBlocks: 50,
	failSafeInactiveWindow: 260000,
	punishmentWindow: PUNISHMENT_PERIOD,
	roundLength: 103,
	minWeightStandby: '100000000000',
	numberActiveValidators: 101,
	numberStandbyValidators: 2,
	validatorRegistrationFee: VALIDATOR_REGISTRATION_FEE.toString(),
	maxBFTWeightCap: 500,
	commissionIncreasePeriod: COMMISSION_INCREASE_PERIOD,
	maxCommissionIncreaseRate: MAX_COMMISSION_INCREASE_RATE,
	useInvalidBLSKey: false,
};

export const enum PoSEventResult {
	STAKE_SUCCESSFUL = 0,
	STAKE_FAILED_NON_REGISTERED_VALIDATOR = 1,
	STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS = 2,
	STAKE_FAILED_TOO_MANY_PENDING_UNLOCKS = 3,
	STAKE_FAILED_TOO_MANY_SENT_STAKES = 4,
}
