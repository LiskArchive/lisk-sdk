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
};
