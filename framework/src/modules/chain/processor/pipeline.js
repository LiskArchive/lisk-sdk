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

const util = require('util');

class Pipeline {
	constructor(stages) {
		this.stages = stages || [];
		this.catchStage = undefined;
		this.finallyStage = undefined;
	}

	pipe(...fns) {
		this.stages.push(...fns);
		return this;
	}

	catchError(fn) {
		if (this.catchStage) {
			throw new Error('Catch stage is already registered');
		}
		this.catchStage = fn;
		return this;
	}

	doFinally(fn) {
		if (this.finallyStage) {
			throw new Error('Finally stage is already registered');
		}
		this.finallyStages = fn;
		return this;
	}

	async exec(data) {
		if (this.stages.length === 0) {
			return undefined;
		}

		let lastResult;
		try {
			// eslint-disable-next-line no-restricted-syntax
			for (const stage of this.stages) {
				if (util.types.isAsyncFunction(stage)) {
					// eslint-disable-next-line no-await-in-loop
					lastResult = await stage(data, lastResult);
				} else {
					lastResult = stage(data, lastResult);
				}
			}
		} catch (error) {
			if (this.catchStage) {
				return this.catchStage(data, error);
			}
			throw error;
		} finally {
			if (this.finallyStage) {
				this.finallyStages(data, lastResult);
			}
		}

		return lastResult;
	}
}

module.exports = {
	Pipeline,
};
