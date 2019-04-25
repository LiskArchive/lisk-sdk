const { Application } = require('lisk-framework');
const {
	DappTransaction,
	InTransferTransaction,
	OutTransferTransaction,
} = require('./transactions');

try {
	// We have to keep it in try/catch block as it can throw
	// exception while validating the configuration
	const config = require('./helpers/config');

	const { NETWORK } = config;
	/* eslint-disable import/no-dynamic-require */
	const genesisBlock = require(`../config/${NETWORK}/genesis_block`);

	const app = new Application(genesisBlock, config);

	const { TRANSACTION_TYPES } = app.constants;

	app.registerTransaction(TRANSACTION_TYPES.DAPP, DappTransaction);
	app.registerTransaction(
		TRANSACTION_TYPES.IN_TRANSFER,
		InTransferTransaction,
		{
			matcher: context =>
				context.blockHeight <
				app.config.modules.chain.exceptions.precedent.disableDappTransfer,
		}
	);
	app.registerTransaction(
		TRANSACTION_TYPES.OUT_TRANSFER,
		OutTransferTransaction,
		{
			matcher: context =>
				context.blockHeight <
				app.config.modules.chain.exceptions.precedent.disableDappTransfer,
		}
	);

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
