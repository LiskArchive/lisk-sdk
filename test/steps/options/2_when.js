/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
 *
 */
import { prepareOptions } from '../../../src/utils/helpers';

export function prepareOptionsIsCalledWithTheOptions() {
	const { options } = this.test.ctx;
	const testFunction = prepareOptions.bind(null, options);

	const returnValue = testFunction();
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}
