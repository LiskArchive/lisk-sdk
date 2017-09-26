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

let vorpal;
let logSpy;
let result;
let returnValue;

const givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog = () => {
	vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
	logSpy = vorpal.activeCommand.log;
};

const givenThereIsAResultToPrint = () => {
	result = { lisk: 'JS' };
};

const whenTheResultIsPrinted = () => {
	returnValue = printResult(vorpal)(result);
};

const whenTheResultIsPrintedWithTheJSONOptionSetToTrue = () => {
	returnValue = printResult(vorpal, { json: true })(result);
};

const thenTheResultShouldBeReturned = () => {
	(returnValue).should.equal(result);
};

const thenATableShouldBeLogged = () => {
	const tableOutput = tablify(result).toString();
	(logSpy.calledWithExactly(tableOutput)).should.be.true();
};

const thenJSONOutputShouldBeLogged = () => {
	const jsonOutput = JSON.stringify(result);
	(logSpy.calledWithExactly(jsonOutput)).should.be.true();
};

describe('print utils', () => {
	describe('#printResult', () => {
		describe('Given there is a Vorpal instance with an active command that can log', () => {
			beforeEach(givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog);

			describe('And there is a result to print', () => {
				beforeEach(givenThereIsAResultToPrint);

				describe('When the result is printed', () => {
					beforeEach(whenTheResultIsPrinted);

					it('Then the result should be returned', thenTheResultShouldBeReturned);
					it('Then a table should be logged', thenATableShouldBeLogged);
				});
				describe('When the result is printed with the JSON option set to true', () => {
					beforeEach(whenTheResultIsPrintedWithTheJSONOptionSetToTrue);

					it('Then the result should be returned', thenTheResultShouldBeReturned);
					it('Then JSON output should be logged', thenJSONOutputShouldBeLogged);
				});
			});
		});
	});
});
