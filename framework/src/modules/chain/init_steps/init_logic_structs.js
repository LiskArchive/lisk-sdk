module.exports = async ({
	config,
	ed,
	schema,
	genesisBlock,
	components: { storage, logger },
}) => {
	const Transaction = require('../logic/transaction.js');
	const Block = require('../logic/block.js');
	const Account = require('../logic/account.js');
	const Peers = require('../logic/peers.js');

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
		new Peers(logger, config, (err, object) => {
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
