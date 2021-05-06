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

export class Rounds {
	public readonly blocksPerRound: number;

	public constructor({ blocksPerRound }: { blocksPerRound: number }) {
		this.blocksPerRound = blocksPerRound;
	}

	public calcRound(height: number): number {
		return Math.ceil(height / this.blocksPerRound);
	}

	public calcRoundStartHeight(round: number): number {
		return (round < 1 ? 0 : round - 1) * this.blocksPerRound + 1;
	}

	public calcRoundEndHeight(round: number): number {
		return (round < 1 ? 0 : round) * this.blocksPerRound;
	}

	public calcRoundMiddleHeight(round: number): number {
		return Math.floor((this.calcRoundStartHeight(round) + this.calcRoundEndHeight(round)) / 2);
	}
}
