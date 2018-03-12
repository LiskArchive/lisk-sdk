/**
 * @namespace repos
 * @memberof db
 * @see Parent: {@link db}
 */

/**
 * @namespace accounts
 * @memberof db.repos
 * @see Parent: {@link db.repos}
 */

/**
 * @namespace blocks
 * @memberof db.repos
 * @see Parent: {@link db.repos}
 */

module.exports = {
	accounts: require('./accounts'),
	blocks: require('./blocks'),
	dapps: require('./dapps'),
	delegates: require('./delegates'),
	migrations: require('./migrations'),
	multisignatures: require('./multisignatures'),
	peers: require('./peers'),
	rounds: require('./rounds'),
	voters: require('./voters'),
	votes: require('./votes'),
	transactions: require('./transactions'),
	'transactions.dapp': require('./transactions/dapp'),
	'transactions.delegate': require('./transactions/delegate'),
	'transactions.inTransfer': require('./transactions/in_transfer'),
	'transactions.multisignature': require('./transactions/multisignature'),
	'transactions.outTransfer': require('./transactions/out_transfer'),
	'transactions.signature': require('./transactions/signature'),
	'transactions.transfer': require('./transactions/transfer'),
	'transactions.vote': require('./transactions/vote'),
};
