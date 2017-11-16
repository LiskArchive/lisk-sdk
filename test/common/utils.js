'use strict';

function randomInt (min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
	randomInt: randomInt
};
