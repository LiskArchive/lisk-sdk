module.exports = async ({
	ed,
	schema,
	components: { storage, logger },
	registeredTransactions,
}) => {
	const InitTransaction = require('../logic/init_transaction.js');
	const Block = require('../logic/block.js');
	const Account = require('../logic/account.js');
	const StateManager = require('../logic/state_store/index.js');

	const accountLogic = await new Promise((resolve, reject) => {
		new Account(storage, schema, logger, (err, object) => {
			err ? reject(err) : resolve(object);
		});
	});

	const initTransactionLogic = new InitTransaction(registeredTransactions);

	const blockLogic = await new Promise((resolve, reject) => {
		new Block(ed, schema, initTransactionLogic, (err, object) => {
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
		stateManager,
	};
};
