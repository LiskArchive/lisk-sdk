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
import lockfile from 'lockfile';
import defaultConfig from '../../../default_config.json';
import * as currentConfig from '../../../src/utils/config';
import { getFirstBoolean, getBooleans, getQuotedStrings } from '../utils';

export function aConfigWithUnknownProperties() {
	const config = {
		corrupted: 'config',
		invalid: 'names',
	};
	currentConfig.default = config;
	this.test.ctx.config = config;
}

export function aConfig() {
	const config = {
		name: 'testy',
		json: true,
		api: {
			testnet: false,
			node: 'localhost',
		},
		pretty: true,
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

export function aConfigWithAPINodesSetTo() {
	const nodes = getQuotedStrings(this.test.parent.title).slice(1);
	const { api } = currentConfig.default;
	api.nodes = nodes;
	const config = { api };

	currentConfig.default = config;
	this.test.ctx.config = config;
}

export function aConfigWithAPINetworkSetTo() {
	const network = getQuotedStrings(this.test.parent.title)[1];
	const { api } = currentConfig.default;
	api.network = network;
	const config = { api };

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

export function thereIsAConfigLockfile() {
	const error = new Error('Found a lockfile');
	lockfile.lock.throws(error);
}

export function thereIsNoConfigLockfile() {}

export function theConfigDirectoryPathIsNotSpecifiedInAnEnvironmentalVariable() {
	delete process.env.LISKY_CONFIG_DIR;
}
