/*
 * LiskHQ/lisk-commander
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
import * as configUtils from '../../../src/utils/config';
import { getFirstBoolean, getBooleans, getQuotedStrings } from '../utils';

export function aConfigWithUnknownProperties() {
	const config = {
		corrupted: 'config',
		invalid: 'names',
	};
	configUtils.getConfig.returns(config);
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
	configUtils.getConfig.returns(config);
	this.test.ctx.config = config;
}

export function aDefaultConfig() {
	this.test.ctx.defaultConfig = defaultConfig;
}

export function theConfigFileCannotBeWritten() {
	configUtils.setConfig.returns(false);
}

export function aConfigWithJsonSetTo() {
	const json = getFirstBoolean(this.test.parent.title);
	const config = { json };

	configUtils.getConfig.returns(config);
	this.test.ctx.config = config;
}

export function aConfigWithAPINetworkAndAPINodesSetTo() {
	const [network, node] = getQuotedStrings(this.test.parent.title);
	const nodes = node ? [node] : [];
	const config = {
		api: {
			network,
			nodes,
		},
	};

	configUtils.getConfig.returns(config);
	this.test.ctx.config = config;
}

export function aConfigWithPrettySetTo() {
	const pretty = getFirstBoolean(this.test.parent.title);
	const config = { pretty };

	configUtils.getConfig.returns(config);
	this.test.ctx.config = config;
}

export function aConfigWithJsonSetToAndPrettySetTo() {
	const [json, pretty] = getBooleans(this.test.parent.title);
	const config = { json, pretty };

	configUtils.getConfig.returns(config);
	this.test.ctx.config = config;
}

export function thereIsAConfigLockfile() {
	lockfile.checkSync.returns(true);
}

export function thereIsNoConfigLockfile() {}

export function theConfigDirectoryPathIsNotSpecifiedInAnEnvironmentalVariable() {
	delete process.env.LISK_COMMANDER_CONFIG_DIR;
}
