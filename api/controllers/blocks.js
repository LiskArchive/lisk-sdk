'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class BlocksController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function BlocksController (scope) {
	modules = scope.modules;
}

BlocksController.getBlocks = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		id: params.blockId.value,
		height: params.height.value,
		generatorPublicKey: params.generatorPublicKey.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.blocks.shared.getBlocks(_.clone(filters), function (err, data) {
		if (err) { return next(err); }

		data = _.cloneDeep(data);

		data = _.map(data, function (block) {

			block.forged = {
				numberOfTransactions: block.numberOfTransactions,
				totalAmount: block.totalAmount.toString(),
				totalFee: block.totalFee.toString(),
				reward: block.reward.toString(),
				totalForged: block.totalForged
			};

			block.generatorAddress = block.generatorId;
			block.previousBlockId = block.previousBlock || '';

			delete block.numberOfTransactions;
			delete block.totalAmount;
			delete block.totalFee;
			delete block.reward;
			delete block.totalForged;
			delete block.previousBlock;
			delete block.generatorId;

			return block;
		});

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			}
		});
	});
};

module.exports = BlocksController;
