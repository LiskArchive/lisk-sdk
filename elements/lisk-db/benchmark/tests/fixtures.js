const crypto = require('crypto');
const randomize = require('randomatic');

const getFakeBlock = transactions_size => ({
	key: `blocks:id:${randomize('0', 10)}`,
	value: crypto.randomBytes(transactions_size),
});

module.exports.getFakeBlock = getFakeBlock;
