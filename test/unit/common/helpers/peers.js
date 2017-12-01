'use strict';

var _ = require('lodash');
var randomstring = require('randomstring');

module.exports = {
	generateMatchedAndUnmatchedBroadhashes: function (unmatchedAmount) {
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
};
