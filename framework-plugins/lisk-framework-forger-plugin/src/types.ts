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

export interface Options {
	readonly rootPath: string;
	readonly label: string;
	readonly port: number;
	readonly whiteList: ReadonlyArray<string>;
	readonly cors: {
		readonly origin: string;
		readonly methods: string[];
	};
	readonly limits: {
		readonly max: number;
		readonly delayMs: number;
		readonly delayAfter: number;
		readonly windowMs: number;
		readonly headersTimeout: number;
		readonly serverSetTimeout: number;
	};
}
