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
 */

export const EVENT_ROUND_CHANGED = 'EVENT_ROUND_CHANGED';
// State store related constants
export const CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS = 'dpos:delegateVoteWeights';
export const CONSENSUS_STATE_DELEGATE_FORGERS_LIST = 'dpos:delegateForgersList';
export const CHAIN_STATE_DELEGATE_USERNAMES = 'delegateUsernames';

export const DEFAULT_ACTIVE_DELEGATE = 101;
export const DEFAULT_STANDBY_DELEGATE = 2;
export const DEFAULT_ROUND_OFFSET = 2;
export const DEFAULT_INIT_ROUND = 3;
export const DEFAULT_GENESIS_HEIGHT = 0;
// Vote weight is capped at the self-vote * DEFAULT_VOTE_WEIGHT_CAP_RATE
export const DEFAULT_VOTE_WEIGHT_CAP_RATE = 10;
export const DEFAULT_STANDBY_THRESHOLD = BigInt(1000) * BigInt(10) ** BigInt(8);

// Punishment period is 780k block height by default
export const PUNISHMENT_PERIOD = 780000;
