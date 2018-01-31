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

var util = require('util');

exports.extend = extend;
exports.copy = copy;
exports.inherits = util.inherits;

function extend(target) {
	if (!target || typeof target !== 'object') {
		return target;
	}

	Array.prototype.slice.call(arguments).forEach(source => {
		if (!source || typeof source !== 'object') {
			return;
		}

		util._extend(target, source);
	});

	return target;
}

function copy(target) {
	if (!target || typeof target !== 'object') {
		return target;
	}

	if (Array.isArray(target)) {
		return target.map(copy);
	} else if (target.constructor === Object) {
		var result = {};
		Object.getOwnPropertyNames(target).forEach(name => {
			result[name] = copy(target[name]);
		});
		return result;
	} else {
		return target;
	}
}
