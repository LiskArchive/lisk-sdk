const { Application } = require('lisk-framework');
const config = require('./helpers/config');

try {
	const { NETWORK } = config;
	/* eslint-disable import/no-dynamic-require */
	const genesisBlock = require(`../config/${NETWORK}/genesis_block`);

	const app = new Application(genesisBlock, config);

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
