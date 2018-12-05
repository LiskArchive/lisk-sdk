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

const Account = require('./account');

class Delegate extends Account {
	constructor(adapter) {
		super(adapter, { isDelegate: true });
		this.defaultOptions.fieldSet = Account.prototype.FIELD_SET_FULL;
	}
}

module.exports = Delegate;
