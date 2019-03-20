module.exports = async ({
	config,
	ed,
	schema,
	genesisBlock,
	components: { storage, logger, system },
}) => {
	const Transaction = require('../logic/transaction');
	const Block = require('../logic/block');
	const Account = require('../logic/account');
	const Peers = require('../logic/peers');
	const StateManager = require('../logic/state_store/index');

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
		new Peers(logger, config, system, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const stateManager = await new Promise((resolve, reject) => {
		new StateManager(storage, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	return {
		account: accountLogic,
		transaction: transactionLogic,
		block: blockLogic,
		peers: peersLogic,
		stateManager,
	};
};
