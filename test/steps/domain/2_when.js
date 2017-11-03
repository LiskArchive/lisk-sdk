/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import {
	deAlias,
} from '../../../src/utils/helpers';

export function deAliasIsCalledOnTheType() {
	const { type } = this.test.ctx;
	const returnValue = deAlias(type);
	this.test.ctx.returnValue = returnValue;
}

export function theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumOfSignaturesAndTheOptions() {
	const { action, lifetime, keysgroup, minimum, options } = this.test.ctx;
	const returnValue = action({ lifetime: lifetime.toString(), keysgroup, minimum: minimum.toString(), options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}
