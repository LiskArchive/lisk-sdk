/*
 * Copyright © 2019 Lisk Foundation
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

const { Pipeline } = require('./pipeline');

class BlockProcessor {
	constructor() {
		this.create = new Pipeline();
		this.getBytes = new Pipeline();
		this.fork = new Pipeline();
		this.validate = new Pipeline();
		this.validateNew = new Pipeline();
		this.verify = new Pipeline();
		this.apply = new Pipeline();
		this.undo = new Pipeline();
	}
}

module.exports = {
	BlockProcessor,
};
