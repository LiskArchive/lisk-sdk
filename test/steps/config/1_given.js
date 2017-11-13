/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import defaultConfig from '../../../defaultConfig.json';
import * as currentConfig from '../../../src/utils/config';
import {
	getFirstBoolean,
	getBooleans,
} from '../utils';

export function aConfig() {
	const config = {
		name: 'testy',
		json: true,
		liskJS: {
			testnet: false,
			node: 'localhost',
			port: 7357,
			ssl: true,
		},
	};
	currentConfig.default = config;
	this.test.ctx.config = config;
}

export function aDefaultConfig() {
	this.test.ctx.defaultConfig = defaultConfig;
}

export function aConfigWithJsonSetTo() {
	const json = getFirstBoolean(this.test.parent.title);
	const config = { json };

	currentConfig.default = config;
	this.test.ctx.config = config;
}

export function aConfigWithPrettySetTo() {
	const pretty = getFirstBoolean(this.test.parent.title);
	const config = { pretty };

	currentConfig.default = config;
	this.test.ctx.config = config;
}

export function aConfigWithJsonSetToAndPrettySetTo() {
	const [json, pretty] = getBooleans(this.test.parent.title);
	const config = { json, pretty };

	currentConfig.default = config;
	this.test.ctx.config = config;
}
