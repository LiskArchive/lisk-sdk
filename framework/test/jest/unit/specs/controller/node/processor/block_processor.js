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
/* eslint-disable max-classes-per-file */

'use strict';

const {
	BaseBlockProcessor,
} = require('../../../../../../../src/controller/node/processor');

class FakeBlockProcessorV0 extends BaseBlockProcessor {
	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 0;
	}

	constructor() {
		super();
		this.serialize.pipe([({ block }) => block]);
		this.deserialize.pipe([({ block }) => block]);
	}
}

class FakeBlockProcessorV1 extends BaseBlockProcessor {
	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 1;
	}

	constructor() {
		super();
		this.serialize.pipe([({ block }) => block]);
		this.deserialize.pipe([({ block }) => block]);
	}
}

module.exports = {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
};
