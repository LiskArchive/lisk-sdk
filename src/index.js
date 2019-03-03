const fs = require('fs');
const path = require('path');
const packageJSON = require('../package');
const { Application, helpers: { validator } } = require('../framework/src');

const packageInfo = {
	version: packageJSON.version,
	minVersion: packageJSON.lisk.minVersion,
	protocolVersion: packageJSON.lisk.protocolVersion,
};

const appSchema = {
	type: 'object',
	properties: {
		NETWORK: {
			type: 'string',
			description:
				'lisk network [devnet|betanet|mainnet|testnet]. Defaults to "devnet"',
			default: 'devnet',
			enum: ['devnet', 'alphanet', 'betanet', 'testnet', 'mainnet'],
			env: 'LISK_NETWORK',
			arg: '-n,--network',
		},
		CUSTOM_CONFIG_FILE: {
			type: ['string', 'null'],
			description: 'Custom configuration file path',
			default: null,
			env: 'LISK_CONFIG_FILE',
			arg: '-c,--config',
		},
	},
};

try {
	const { NETWORK, CUSTOM_CONFIG_FILE } = validator.validateWithDefaults(
		appSchema,
		{}
	);

	/* eslint-disable import/no-dynamic-require */
	let customConfig = {};
	const networkConfig = require(`../config/${NETWORK}/config`);
	const constants = require(`../config/${NETWORK}/constants`);
	const exceptions = require(`../config/${NETWORK}/exceptions`);
	const genesisBlock = require(`../config/${NETWORK}/genesis_block`);

	if (CUSTOM_CONFIG_FILE) {
		customConfig = JSON.parse(
			fs.readFileSync(path.resolve(CUSTOM_CONFIG_FILE), 'utf8')
		);
	}

	// To run multiple applications for same network for integration tests
	const appName = config =>
		`lisk-${NETWORK}-${config.modules.http_api.httpPort}`;

	const app = new Application(appName, genesisBlock, constants, [
		networkConfig,
		customConfig,
		packageInfo,
	]);

	app.overrideModuleOptions('chain', { exceptions });

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(error => {
			if (error instanceof Error) {
				app.logger.error('App stopped with error', error.message);
				app.logger.debug(error.stack);
			} else {
				app.logger.error('App stopped with error', error);
			}
			process.exit();
		});
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}
