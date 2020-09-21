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

type ReleaseFunc = () => void;

export class Mutex {
	private readonly _queue: Array<(relaseFunc: ReleaseFunc) => void> = [];
	private _locked = false;

	public async acquire(): Promise<ReleaseFunc> {
		const isLocked = this.isLocked();
		const releaseFunc = new Promise<ReleaseFunc>(resolve => this._queue.push(resolve));
		if (!isLocked) {
			this._tick();
		}
		return releaseFunc;
	}

	public isLocked(): boolean {
		return this._locked;
	}

	public async runExclusive<T>(worker: () => Promise<T>): Promise<T> {
		const release = await this.acquire();
		try {
			return await worker();
		} finally {
			release();
		}
	}

	private _tick(): void {
		const releaseFunc = this._queue.shift();
		if (!releaseFunc) {
			return;
		}
		const nextReleaseFunc = () => {
			this._locked = false;
			this._tick();
		};
		this._locked = true;
		releaseFunc(nextReleaseFunc);
	}
}
