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

const deepFreeze = o => {
	Object.freeze(o);
	if (o === undefined) {
		return o;
	}

	Object.getOwnPropertyNames(o).forEach(prop => {
		if (
			o[prop] !== null &&
			(typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
			!Object.isFrozen(o[prop])
		) {
			deepFreeze(o[prop]);
		}
	});

	return o;
};

module.exports = {
	deepFreeze,
};
