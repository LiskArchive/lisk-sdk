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

'use strict';

interface SlotsConstructor {
	readonly epochTime: string;
	readonly interval: number;
	readonly blocksPerRound: number;
}

export class Slots {
	private readonly epochTime: string;
	private readonly interval: number;
	private readonly blocksPerRound: number;

	public constructor({
		epochTime,
		interval,
		blocksPerRound,
	}: SlotsConstructor) {
		this.epochTime = epochTime;
		this.interval = interval;
		this.blocksPerRound = blocksPerRound;
	}

	public getEpochTime(time: number = Date.now()): number {
		// tslint:disable-next-line:no-magic-numbers
		return Math.floor((time - new Date(this.epochTime).getTime()) / 1000);
	}

	public getRealTime(epochTime: number = this.getEpochTime()): number {
		return (
			// tslint:disable-next-line:no-magic-numbers
			Math.floor(new Date(this.epochTime).getTime() / 1000) * 1000 +
			// tslint:disable-next-line:no-magic-numbers
			epochTime * 1000
		);
	}

	public getSlotNumber(epochTime: number = this.getEpochTime()): number {
		return Math.floor(epochTime / this.interval);
	}

	public getSlotTime(slot: number): number {
		return slot * this.interval;
	}

	public getNextSlot(): number {
		const slot = this.getSlotNumber();

		return slot + 1;
	}

	public getLastSlot(nextSlot: number): number {
		return nextSlot + this.blocksPerRound;
	}

	public isWithinTimeslot(slot: number, time: number): boolean {
		return this.getSlotNumber(time) === slot;
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
