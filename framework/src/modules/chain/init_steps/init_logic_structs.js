module.exports = async ({
	ed,
	schema,
	components: { storage, logger },
	registeredTransactions,
}) => {
	const InitTransaction = require('../logic/init_transaction.js');
	const Block = require('../logic/block.js');
	const Account = require('../logic/account.js');

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

	return {
		account: accountLogic,
		initTransaction: initTransactionLogic,
		block: blockLogic,
	};
};
