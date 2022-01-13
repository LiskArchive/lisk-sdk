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
import { Network } from './network';

interface RateTracker {
	[key: string]: { [key: string]: number };
}

export const DEFAULT_RATE_RESET_TIME = 10000;
export class BaseNetworkEndpoint {
	protected network: Network;

	private _rateTracker: RateTracker = {};
	private _limitResetInterval!: NodeJS.Timeout;

	public constructor(network: Network) {
		this.network = network;
	}

	public start() {
		this._limitResetInterval = setInterval(() => {
			this._rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	public stop() {
		clearInterval(this._limitResetInterval);
	}

	protected addRateLimit(procedure: string, peerId: string, limit: number): void {
		if (this._rateTracker[procedure] === undefined) {
			this._rateTracker[procedure] = { [peerId]: 0 };
		}
		this._rateTracker[procedure][peerId] = this._rateTracker[procedure][peerId]
			? this._rateTracker[procedure][peerId] + 1
			: 1;
		if (this._rateTracker[procedure][peerId] > limit) {
			this.network.applyPenaltyOnPeer({
				peerId,
				penalty: 10,
			});
		}
	}
}
