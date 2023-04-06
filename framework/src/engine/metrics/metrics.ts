/*
 * Copyright © 2023 Lisk Foundation
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
/* eslint-disable @typescript-eslint/no-empty-function */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

const noopCounter = {
	inc: (_num?: number) => {},
	reset: () => {},
};

const noopGauge = {
	inc: (_num?: number) => {},
	dec: (_num?: number) => {},
	set: (_num: number) => {},
};

const noopHistogram = {
	observe: (_num: number) => {},
	startTimer: () => () => {},
	reset: () => {},
};

export class Metrics {
	private _enable: boolean;
	private readonly _registry: Registry;

	public constructor(enable: boolean) {
		this._enable = enable;
		this._registry = new Registry();
	}

	public enable() {
		this._enable = true;
	}

	public disable() {
		this._enable = false;
	}

	public enabled() {
		return this._enable;
	}

	public counter(name: string) {
		if (!this._enable) {
			return noopCounter;
		}
		const newCounter = new Counter({
			name,
			help: name,
			registers: [this._registry],
		});
		return newCounter;
	}

	public gauge(name: string) {
		if (!this._enable) {
			return noopGauge;
		}
		const newGauge = new Gauge({
			name,
			help: name,
			registers: [this._registry],
		});
		return newGauge;
	}

	public histogram(name: string, buckets: number[] = []) {
		if (!this._enable) {
			return noopHistogram;
		}
		const newHistogram = new Histogram({
			name,
			help: name,
			registers: [this._registry],
			buckets,
		});
		return newHistogram;
	}

	public async report(inJSON?: boolean) {
		if (inJSON) {
			return this._registry.getMetricsAsJSON();
		}
		return this._registry.metrics();
	}
}

export const defaultMetrics = new Metrics(false);
