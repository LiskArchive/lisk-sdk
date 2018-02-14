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
	accounts: require('./accounts.js'),
	blocks: require('./blocks.js'),
	dapps: require('./dapps.js'),
	delegates: require('./delegates.js'),
	migrations: require('./migrations.js'),
	multisignatures: require('./multisignatures.js'),
	peers: require('./peers.js'),
	rounds: require('./rounds.js'),
	voters: require('./voters.js'),
	votes: require('./votes.js'),
	'transactions.dapp': require('./transactions.dapp.js'),
	'transactions.delegate': require('./transactions.delegate.js'),
	'transactions.inTransfer': require('./transactions.in_transfer.js'),
	transactions: require('./transactions.js'),
	'transactions.multisignature': require('./transactions.multisignature.js'),
	'transactions.outTransfer': require('./transactions.out_transfer.js'),
	'transactions.signature': require('./transactions.signature.js'),
	'transactions.transfer': require('./transactions.transfer.js'),
	'transactions.vote': require('./transactions.vote.js'),
};
