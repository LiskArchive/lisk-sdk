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
import print from '../../src/utils/print';
// Required for stubbing
const tablify = require('../../src/utils/tablify');

describe('print utils', () => {
	const objectToPrint = {
		lisk: 'Some prefix: \u001B[4mJS\u001B[0m',
	};
	const objectToPrintWithoutANSI = {
		lisk: 'Some prefix: JS',
	};
	const arrayToPrint = [
		{ lisk: 'Some prefix: \u001B[4mJS\u001B[0m' },
		{ lisk: 'Some suffix: \u001B[4mawsome\u001B[0m' },
	];
	const arrayToPrintWithoutANSI = [
		{ lisk: 'Some prefix: JS' },
		{ lisk: 'Some suffix: awsome' },
	];

	const tablifyResult = 'tablify-result';
	let tablifyStub;
	beforeEach(() => {
		tablifyStub = sandbox.stub(tablify, 'default').returns(tablifyResult);
		sandbox.stub(JSON, 'stringify');
		return Promise.resolve();
	});

	describe('when json and pretty is false', () => {
		let printer;
		beforeEach(() => {
			printer = print();
			return Promise.resolve();
		});

		describe('when result is array', () => {
			it('should call tablify with the ANSI', () => {
				printer(arrayToPrint);
				return expect(tablifyStub).to.be.calledWithExactly(arrayToPrint);
			});
		});

		describe('when there is log on the context', () => {
			it('should call tablify with the result', () => {
				const ctx = {
					log: sandbox.stub(),
				};
				printer.call(ctx, arrayToPrint);
				expect(tablifyStub).to.be.calledWithExactly(arrayToPrint);
				return expect(ctx.log).to.be.calledWithExactly(tablifyResult);
			});
		});
	});

	describe('when json is true and pretty is false', () => {
		describe('when result is array', () => {
			let log;
			beforeEach(() => {
				log = sandbox.stub();
				print({ json: true }).call({ log }, arrayToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					arrayToPrintWithoutANSI,
					null,
					null,
				);
			});
		});

		describe('when result is object', () => {
			let log;
			beforeEach(() => {
				log = sandbox.stub();
				print({ json: true }).call({ log }, objectToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					objectToPrintWithoutANSI,
					null,
					null,
				);
			});
		});
	});

	describe('when json and pretty is true', () => {
		let log;
		beforeEach(() => {
			log = sandbox.stub();
			print({ json: true, pretty: true }).call({ log }, arrayToPrint);
			return Promise.resolve();
		});

		it('should call JSON.stringify without the ANSI', () => {
			return expect(JSON.stringify).to.be.calledWithExactly(
				arrayToPrintWithoutANSI,
				null,
				'\t',
			);
		});
	});
});
