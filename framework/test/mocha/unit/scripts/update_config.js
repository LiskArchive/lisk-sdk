/*
 * Copyright © 2018 Lisk Foundation
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

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const dirPath = __dirname;
const rootPath = path.dirname(path.resolve(__filename, '../../../../../'));

describe('scripts/update_config', () => {
	const testedConfigPath = `${dirPath}/tested_config.json`;
	const updatedConfigPath = `${dirPath}/updated_config.json`;
	let spawnedScript;
	let testedConfig;
	let updatedConfig;

	before(async () => {
		spawnedScript = spawnSync(
			'node',
			[
				'./scripts/update_config.js',
				'--network',
				'testnet',
				'--output',
				updatedConfigPath,
				testedConfigPath,
				'1.0.0',
			],
			{ cwd: rootPath }
		);
		testedConfig = fs.readFileSync(`${dirPath}/tested_config.json`);
		updatedConfig = fs.readFileSync(`${dirPath}/updated_config.json`);
	});

	after(async () => {
		fs.unlinkSync(updatedConfigPath);
	});

	it('should run update_config with no errors', async () => {
		expect(spawnedScript.stderr.toString()).to.be.empty;
	});

	it('should create an updated file equal to the tested file', async () => {
		const testedConfigJson = JSON.parse(testedConfig.toString());
		const updatedConfigJson = JSON.parse(updatedConfig.toString());

		expect(testedConfigJson).to.deep.eql(updatedConfigJson);
	});
});
