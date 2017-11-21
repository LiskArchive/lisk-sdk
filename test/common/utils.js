'use strict';

var randomstring = require('randomstring');
var _ = require('lodash');

function randomInt (min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMatchedAndUnmatchedBroadhashes (unmatchedAmount) {

	var characterNotPresentInValidBroadhash = '@';
	var validBroadhash = randomstring.generate({
		length: 64,
		custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.'
	});
	return _.range(unmatchedAmount).reduce(function (result) {
		result.unmatchedBroadhashes.push(randomstring.generate({
			length: 63,
			custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.'
		}) + characterNotPresentInValidBroadhash);
		return result;
	}, {
		matchedBroadhash: validBroadhash,
		unmatchedBroadhashes: []
	});
}

module.exports = {
	generateMatchedAndUnmatchedBroadhashes: generateMatchedAndUnmatchedBroadhashes,
	randomInt: randomInt
};
