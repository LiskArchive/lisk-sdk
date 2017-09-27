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
import lisk from 'lisk-js';
import tablify from '../../src/utils/tablify';

export const thenTheLiskInstanceShouldBeALiskJSApiInstance = () => {
	(context.liskInstance).should.be.instanceOf(lisk.api);
};

export const thenTheResultShouldBeReturned = () => {
	(context.returnValue).should.equal(context.result);
};

export const thenATableShouldBeLogged = () => {
	const tableOutput = tablify(context.result).toString();
	(context.vorpal.activeCommand.log.calledWithExactly(tableOutput)).should.be.true();
};

export const thenJSONOutputShouldBeLogged = () => {
	const jsonOutput = JSON.stringify(context.result);
	(context.vorpal.activeCommand.log.calledWithExactly(jsonOutput)).should.be.true();
};
