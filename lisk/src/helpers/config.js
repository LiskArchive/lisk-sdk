
const path = require('path');
const {
	helpers: { configurator },
} = require('lisk-framework');

const appSchema = {
	type: 'object',
	properties: {
		NETWORK: {
			type: 'string',
			description:
				'lisk network [devnet|betanet|mainnet|testnet]. Defaults to "devnet"',
			enum: ['devnet', 'alphanet', 'betanet', 'testnet', 'mainnet'],
			env: 'LISK_NETWORK',
			arg: '--network,-n',
		},
		CUSTOM_CONFIG_FILE: {
			type: ['string', 'null'],
			description: 'Custom configuration file path',
			default: null,
			env: 'LISK_CONFIG_FILE',
			arg: '--config,-c',
		},
	},
	default: {
		NETWORK: 'devnet',
		CUSTOM_CONFIG_FILE: null,
	},
};

configurator.registerSchema(appSchema);

const packageJSON = require('../../package');

const appConfig = {
	app: {
		version: packageJSON.version,
		minVersion: packageJSON.lisk.minVersion,
		protocolVersion: packageJSON.lisk.protocolVersion,
	},
};

// Support for PROTOCOL_VERSION only for tests
if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
	appConfig.app.protocolVersion = process.env.PROTOCOL_VERSION;
}

const { NETWORK, CUSTOM_CONFIG_FILE } = configurator.getConfig();

configurator.loadConfigFile(path.resolve(__dirname, `../../config/${NETWORK}/config`));
configurator.loadConfigFile(path.resolve(__dirname, `../../config/${NETWORK}/exceptions`), 'modules.chain.exceptions');

if (CUSTOM_CONFIG_FILE) {
	configurator.loadConfigFile(path.resolve(CUSTOM_CONFIG_FILE));
}

module.exports = configurator.getConfig();
