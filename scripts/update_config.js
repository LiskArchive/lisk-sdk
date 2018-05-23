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
 */

const fs = require('fs');
const readline = require('readline');
const program = require('commander');
const extend = require('extend');
const lisk = require('lisk-js');

program
	.version('0.1.1')
	.option('-o, --old <path>', 'Old config.json')
	.option('-n, --new <path>', 'New config.json', './config.json')
	.option('-p, --password <string>', 'Password for secret encryption', '')
	.parse(process.argv);

let oldConfig;
let newConfig;

if (program.old) {
	oldConfig = JSON.parse(fs.readFileSync(program.old, 'utf8'));

	// Values to keep from new config file
	delete oldConfig.version;
	delete oldConfig.minVersion;

	// Rename old port to new wsPort
	oldConfig.httpPort = oldConfig.port;
	oldConfig.wsPort = oldConfig.httpPort + 1;
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
	oldConfig.peers.list.map(p => {
		p.wsPort = p.port;
		delete p.port;
	});

	if (oldConfig.forging.secret && oldConfig.forging.secret.length) {
		if (!program.password.trim()) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			rl.question(
				'We found some secrets in your config, if you want to migrate, please type in your password (enter to skip): ',
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
} else {
	console.info('Previous config.json not found, exiting.');
	process.exit(1);
}

function migrateSecrets(password) {
	oldConfig.forging.delegates = [];

	if (!password.trim()) {
		console.info('\nSkipping the secret migration.');
		delete oldConfig.forging.secret;
		return;
	}

	console.info('\nMigrating your secrets...');
	oldConfig.forging.defaultPassword = password;
	oldConfig.forging.secret.map(secret => {
		console.info('.......');
		oldConfig.forging.delegates.push({
			encryptedPassphrase: lisk.default.cryptography.stringifyEncryptedPassphrase(
				lisk.default.cryptography.encryptPassphraseWithPassword(
					secret,
					password,
					1
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
	if (program.new) {
		newConfig = JSON.parse(fs.readFileSync(program.new, 'utf8'));
		newConfig = extend(true, {}, newConfig, oldConfig);

		fs.writeFile(program.new, JSON.stringify(newConfig, null, '\t'), err => {
			if (err) {
				throw err;
			}
		});
	}
	console.info('Configuration migration completed.');
}
