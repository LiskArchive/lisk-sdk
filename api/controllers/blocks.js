/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Description of the function.
 *
 * @class
 * @memberof api/controllers
 * @requires lodash
 * @param {Object} scope - App instance
 * @todo: Add description of BlocksController
 */
function BlocksController(scope) {
	modules = scope.modules;
}

/**
 * Description of the function.
 *
 * @param {Object} context - Description of the param
 * @param {function} next - Description of the param
 * @todo: Add description of the function and its parameters
 */
BlocksController.getBlocks = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
		id: params.blockId.value,
		height: params.height.value,
		generatorPublicKey: params.generatorPublicKey.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	modules.blocks.shared.getBlocks(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data = _.cloneDeep(data);

		data = _.map(data, block => {
			block.totalAmount = block.totalAmount.toString();
			block.totalFee = block.totalFee.toString();
			block.reward = block.reward.toString();
			block.totalForged = block.totalForged.toString();
			block.generatorAddress = block.generatorId;
			block.previousBlockId = block.previousBlock || '';

			delete block.previousBlock;
			delete block.generatorId;

			return block;
		});

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	});
};

module.exports = BlocksController;
