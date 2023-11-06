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
import { SharedState } from '../types';

interface BlockHeader {
	// eslint-disable-next-line @typescript-eslint/ban-types
	blockHeader: object;
	timeReceived: number;
}

export interface ForkStats {
	readonly forkEventCount: number;
	blockHeaders: Record<string, BlockHeader>;
}

export const getForkStats = (state: SharedState): ForkStats => ({
	forkEventCount: state.forks.forkEventCount,
	blockHeaders: state.forks.blockHeaders,
});
