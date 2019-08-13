const { constants } = require('./constants');

const randomInt = (low, high) => {
	return Math.round(Math.random() * (high - low) + low);
};

module.exports = {
	constants,
	randomInt,
};
