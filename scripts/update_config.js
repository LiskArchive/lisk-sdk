/*
 * LiskHQ/lisk-scripts/updateConfig.js
 * Copyright (C) 2017 Lisk Foundation
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
 * Usage Example:
 * 		node scripts/update_config.js ../lisk-backup/config.json ./config.json
 *
 * 	Reference:
 * 		A user manual can be found on documentation site under /documentation/lisk-core/upgrade/upgrade-configurations
 */

const fs = require('fs');
const readline = require('readline');
const program = require('commander');
const extend = require('extend');
const lisk = require('lisk-elements');

let oldConfigPath;
let newConfigPath;

program
	.version('0.1.1')
	.arguments('<old_config_file> <new_config_file>')
	.action((oldConfig, newConfig) => {
		oldConfigPath = oldConfig;
		newConfigPath = newConfig;
	})
	.option(
		'-p, --password <string>',
		"Password for secret encryption. This feature is only for testing purpose, don't use is it production.",
		''
	)
	.parse(process.argv);

if (!oldConfigPath || !newConfigPath) {
	console.error('error: no config file provided.');
	process.exit(1);
}

console.info('Starting configuration migration...');
const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));

newConfig.api.ssl = extend(true, {}, oldConfig.ssl);
delete oldConfig.ssl;

// Values to keep from new config file
delete oldConfig.version;
delete oldConfig.minVersion;

// Rename old port to new wsPort
oldConfig.httpPort = oldConfig.port;
oldConfig.wsPort = oldConfig.port + 1;
delete oldConfig.port;

oldConfig.db.max = oldConfig.db.poolSize;
delete oldConfig.db.poolSize;

delete oldConfig.peers.options.limits;

oldConfig.transactions.maxTransactionsPerQueue =
	oldConfig.transactions.maxTxsPerQueue;
delete oldConfig.transactions.maxTxsPerQueue;

delete oldConfig.loading.verifyOnLoading;
delete oldConfig.dapp;

// Peers migration
oldConfig.peers.list = oldConfig.peers.list.map(p => {
	p.wsPort = p.port + 1;
	delete p.port;
	return p;
});

if (oldConfig.forging.secret && oldConfig.forging.secret.length) {
	if (!program.password.trim()) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(
			'We found some secrets in your config, if you want to migrate, please enter password with minimum 5 characters (enter to skip): ',
			password => {
				rl.close();
				migrateSecrets(password);
				copyTheConfigFile();
			}
		);
		// To Patch the password support
		rl.stdoutMuted = true;
		rl._writeToOutput = function _writeToOutput(stringToWrite) {
			if (rl.stdoutMuted) rl.output.write('*');
			else rl.output.write(stringToWrite);
		};
	} else {
		migrateSecrets(program.password);
		copyTheConfigFile();
	}
} else {
	migrateSecrets('');
	copyTheConfigFile();
}

function migrateSecrets(password) {
	oldConfig.forging.delegates = [];
	password = password.trim();
	if (!password) {
		console.info('\nSkipping the secret migration.');
		delete oldConfig.forging.secret;
		return;
	}

	if (password.length < 5) {
		console.error(
			`error: Password is too short (${
				password.length
			} characters), minimum 5 characters.`
		);
		process.exit(1);
	}

	console.info('\nMigrating your secrets...');
	oldConfig.forging.defaultPassword = password;
	oldConfig.forging.secret.forEach(secret => {
		console.info('.......');
		oldConfig.forging.delegates.push({
			encryptedPassphrase: lisk.default.cryptography.stringifyEncryptedPassphrase(
				lisk.default.cryptography.encryptPassphraseWithPassword(
					secret,
					password
				)
			),
			publicKey: lisk.default.cryptography.getPrivateAndPublicKeyFromPassphrase(
				secret
			).publicKey,
		});
	});

	delete oldConfig.forging.secret;
}

function copyTheConfigFile() {
	const modifiedConfig = extend(true, {}, newConfig, oldConfig);

	fs.writeFile(
		newConfigPath,
		JSON.stringify(modifiedConfig, null, '\t'),
		err => {
			if (err) {
				throw err;
			} else {
				console.info('Configuration migration completed.');
			}
		}
	);
}
