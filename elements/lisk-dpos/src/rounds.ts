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

interface RoundConstructor {
	readonly blocksPerRound: number;
}

export class Rounds {
	private readonly blocksPerRound: number;

	public constructor({ blocksPerRound }: RoundConstructor) {
		this.blocksPerRound = blocksPerRound;
	}

	public calcRound(height: number): number {
		return Math.ceil(height / this.blocksPerRound);
	}

	public calcRoundStartHeight(round: number): number {
		return (round < 1 ? 0 : round - 1) * this.blocksPerRound + 1;
	}

	public calcRoundEndHeight(round: number): number {
		return (round < 1 ? 1 : round) * this.blocksPerRound;
	}
}
