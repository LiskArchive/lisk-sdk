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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StageFunction<T> = (data: T, lastResult?: any) => Promise<any>;
type ErrorFunction<T> = (data: T, error?: Error) => Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinalFunction<T> = (data: T, lastResult?: any) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Pipeline<T, K = void> {
	private readonly stages: StageFunction<T>[];
	private catchStage: ErrorFunction<T> | undefined;
	private finallyStage: FinalFunction<T> | undefined;

	public constructor(stages: StageFunction<T>[] = []) {
		this.stages = stages;
		this.catchStage = undefined;
		this.finallyStage = undefined;
	}

	public pipe(fns: StageFunction<T>[]): Pipeline<T, K> {
		this.stages.push(...fns);
		return this;
	}

	public catchError(fn: StageFunction<T>): Pipeline<T, K> {
		if (this.catchStage) {
			throw new Error('Catch stage is already registered');
		}
		this.catchStage = fn;
		return this;
	}

	public doFinally(fn: StageFunction<T>): Pipeline<T, K> {
		if (this.finallyStage) {
			throw new Error('Finally stage is already registered');
		}
		this.finallyStage = fn;
		return this;
	}

	public async run(data: T): Promise<K> {
		if (this.stages.length === 0) {
			throw new Error('No stage registered to the pipeline');
		}

		let lastResult;
		try {
			// eslint-disable-next-line no-restricted-syntax
			for (const stage of this.stages) {
				// eslint-disable-next-line no-await-in-loop
				lastResult = (await stage(data, lastResult)) as K;
			}
		} catch (error) {
			if (this.catchStage) {
				await this.catchStage(data, error);
			}
			throw error;
		} finally {
			if (this.finallyStage) {
				await this.finallyStage(data, lastResult);
			}
		}

		return lastResult as K;
	}
}
