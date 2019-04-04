module.exports = async ({
	config,
	ed,
	schema,
	genesisBlock,
	components: { storage, logger },
	applicationState,
}) => {
	const Transaction = require('../logic/transaction');
	const Block = require('../logic/block');
	const Account = require('../logic/account');
	const Peers = require('../logic/peers');

	const accountLogic = await new Promise((resolve, reject) => {
		new Account(storage, schema, logger, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const transactionLogic = await new Promise((resolve, reject) => {
		new Transaction(
			storage,
			ed,
			schema,
			genesisBlock,
			accountLogic,
			logger,
			(err, object) => {
				err ? reject(err) : resolve(object);
			}
		);
	});

	const blockLogic = await new Promise((resolve, reject) => {
		new Block(ed, schema, transactionLogic, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const peersLogic = await new Promise((resolve, reject) => {
		new Peers(logger, config, applicationState, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	return {
		account: accountLogic,
		transaction: transactionLogic,
		block: blockLogic,
		peers: peersLogic,
	};
};
