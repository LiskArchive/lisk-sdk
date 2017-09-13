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
import { printResult } from '../../src/utils/print';
import tablify from '../../src/utils/tablify';

describe('print utils', () => {
	describe('#printResult', () => {
		let vorpal;
		let result;
		let stub;

		beforeEach(() => {
			vorpal = {
				activeCommand: {
					log: () => {},
				},
			};
			result = { lisk: 'JS' };
			stub = sinon.stub(vorpal.activeCommand, 'log');
		});

		afterEach(() => {
			stub.restore();
		});

		it('should return the result', () => {
			const returnValue = printResult(vorpal)(result);
			(returnValue).should.equal(result);
		});

		it('should print a table', () => {
			printResult(vorpal)(result);
			(stub.calledWithExactly(tablify(result).toString())).should.be.true();
		});

		it('should print JSON', () => {
			printResult(vorpal, { json: true })(result);
			(stub.calledWithExactly(JSON.stringify(result))).should.be.true();
		});
	});
});
