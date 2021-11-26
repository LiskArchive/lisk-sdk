const crypto = require('crypto');
const randomize = require('randomatic');

const getFakeBlock = payload_size => ({
	key: `blocks:id:${randomize('0', 10)}`,
	value: crypto.randomBytes(payload_size),
});

module.exports.getFakeBlock = getFakeBlock;
