module.exports = async ({
	config,
	ed,
	schema,
	components: { storage, logger },
	applicationState,
}) => {
	const InitTransaction = require('../logic/init_transaction.js');
	const Block = require('../logic/block.js');
	const Account = require('../logic/account.js');
	const Peers = require('../logic/peers.js');
	const StateManager = require('../logic/state_store/index.js');

	const accountLogic = await new Promise((resolve, reject) => {
		new Account(storage, schema, logger, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const initTransactionLogic = await new InitTransaction();

	const blockLogic = await new Promise((resolve, reject) => {
		new Block(ed, schema, initTransactionLogic, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const peersLogic = await new Promise((resolve, reject) => {
		new Peers(logger, config, applicationState, (err, object) => {
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
		initTransaction: initTransactionLogic,
		block: blockLogic,
		peers: peersLogic,
		stateManager,
	};
};
