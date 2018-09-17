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

var Promise = require('bluebird');

/**
 * Description of the class.
 *
 * @class
 * @memberof helpers
 * @returns {Object}
 * @see Parent: {@link helpers}
 * @todo Add description for the class and the return value
 */
function PromiseDefer() {
	var resolve;
	var reject;
	var promise = new Promise((__resolve, __reject) => {
		resolve = __resolve;
		reject = __reject;
	});

	return {
		resolve,
		reject,
		promise,
	};
}

module.exports = PromiseDefer;
