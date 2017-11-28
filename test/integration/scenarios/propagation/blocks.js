'use strict';

var _ = require('lodash');
var expect = require('chai').expect;
var Promise = require('bluebird');
var utils = require('../../utils');

module.exports = function (params) {

	describe('blocks', function () {

		var nodesBlocks;

		before(function () {
			return Promise.all(params.configurations.map(function (configuration) {
				return utils.http.getBlocks(configuration.httpPort);
			})).then(function (blocksResults) {
				nodesBlocks = blocksResults;
			});
		});

		it('should be able to get blocks list from every peer', function () {
			expect(nodesBlocks).to.have.lengthOf(params.configurations.length);
		});

		it('should contain non empty blocks after running functional tests', function () {
			nodesBlocks.forEach(function (blocks) {
				expect(blocks).to.be.an('array').and.not.to.be.empty;
			});
		});

		it('should have all peers at the same height', function () {
			var uniquePeersHeights = _(nodesBlocks).map('length').uniq().value();
			expect(uniquePeersHeights).to.have.lengthOf.at.least(1);
		});

		it('should have all blocks the same at all peers', function () {
			var patternBlocks = nodesBlocks[0];
			for (var i = 0; i < patternBlocks.length; i += 1) {
				for (var j = 1; j < nodesBlocks.length; j += 1) {
					expect(_.isEqual(nodesBlocks[j][i], patternBlocks[i]));
				}
			}
		});
	});
};
