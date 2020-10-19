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

export class Defer<T> {
	private readonly _promise: Promise<T>;
	private _resolve!: (status?: T) => void;
	private _reject!: (status?: T | Error) => void;
	private _isResolved = false;

	public constructor(timeout = 0, timeoutMessage?: string) {
		this._promise = new Promise<T>((_resolve, _reject) => {
			this._resolve = _resolve;
			this._reject = _reject;
		});

		if (timeout) {
			setTimeout(() => {
				if (!this.isResolved) {
					this.reject(new Error(timeoutMessage ?? 'Defer timeout occurred'));
				}
			}, timeout);
		}
	}

	public get isResolved(): boolean {
		return this._isResolved;
	}

	public get promise(): Promise<T> {
		return this._promise;
	}

	public resolve(status?: T): void {
		this._resolve(status);
		this._isResolved = true;
	}

	public reject(status?: Error | T): void {
		this._reject(status);
		this._isResolved = true;
	}
}
