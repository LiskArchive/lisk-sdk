import { Application } from 'lisk-framework';
import {
	DappTransaction,
	InTransferTransaction,
	OutTransferTransaction,
} from './transactions';

try {
	/**
	 * We have to keep it in try/catch block as it can throw
	 * exception while validating the configuration
	 */

	// tslint:disable-next-line no-require-imports no-var-requires
	const { config } = require('./helpers/config');

	const { NETWORK } = config;
	// tslint:disable-next-line no-var-requires
	const genesisBlock = require(`../config/${NETWORK}/genesis_block.json`);

	const constants = {
		TRANSACTION_TYPES: {
			DAPP: 5,
			IN_TRANSFER: 6,
			OUT_TRANSFER: 7,
		},
	};

	const app = new Application(genesisBlock, config);

	const { TRANSACTION_TYPES } = constants;

	app.registerTransaction(TRANSACTION_TYPES.DAPP, DappTransaction);
	app.registerTransaction(TRANSACTION_TYPES.IN_TRANSFER, InTransferTransaction);
	app.registerTransaction(
		TRANSACTION_TYPES.OUT_TRANSFER,
		OutTransferTransaction
	);

	app
		.run()
		.then(() => app.logger.info('App started...'))
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
	// tslint:disable-next-line no-console
	console.error('Application start error.', e);
	process.exit();
}
