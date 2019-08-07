/*
 * LiskHQ/lisk-commander
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
 *
 */
import { expect } from 'chai';
import { print, StringMap } from '../../src/utils/print';
import { SinonStub } from 'sinon';
import * as tablifyUtil from '../../src/utils/tablify';

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
	const stringifyResult =
		'[{"lisk":"Some prefix: JS"},{"lisk":"Some suffix: awsome"}]';

	type Printer = (result: ReadonlyArray<StringMap> | StringMap) => void;

	beforeEach(() => {
		sandbox.stub(tablifyUtil, 'tablify').returns(tablifyResult);
		sandbox.stub(JSON, 'stringify').returns(stringifyResult);
		return Promise.resolve();
	});

	describe('when json and pretty are false', () => {
		let printer: Printer;
		beforeEach(() => {
			printer = print();
			return Promise.resolve();
		});

		describe('when result is array', () => {
			it('should call tablify with the ANSI', () => {
				printer(arrayToPrint);
				return expect(tablifyUtil.tablify).to.be.calledWithExactly(
					arrayToPrint,
				);
			});
		});

		describe('when there is log on the context', () => {
			it('should call tablify with the result and call the log of the context', () => {
				const log = sandbox.stub();
				printer.call({ log }, arrayToPrint);
				expect(tablifyUtil.tablify).to.be.calledWithExactly(arrayToPrint);
				return expect(log).to.be.calledWithExactly(tablifyResult);
			});
		});
	});

	describe('when json is true and pretty is false and the context has a log method', () => {
		describe('when result is array', () => {
			let log: SinonStub;
			beforeEach(() => {
				log = sandbox.stub();
				print({ json: true }).call({ log }, arrayToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					arrayToPrintWithoutANSI,
					undefined,
					undefined,
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).to.be.calledWithExactly(stringifyResult);
			});
		});

		describe('when result is object', () => {
			let log: SinonStub;
			beforeEach(() => {
				log = sandbox.stub();
				print({ json: true }).call({ log }, objectToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					objectToPrintWithoutANSI,
					undefined,
					undefined,
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).to.be.calledWithExactly(stringifyResult);
			});
		});
	});

	describe('when json and pretty are true and the context has a log method', () => {
		let log: SinonStub;
		beforeEach(() => {
			log = sandbox.stub();
			return Promise.resolve();
		});
		describe('when result is array', () => {
			beforeEach(() => {
				print({ json: true, pretty: true }).call({ log }, arrayToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					arrayToPrintWithoutANSI,
					undefined,
					'\t',
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).to.be.calledWithExactly(stringifyResult);
			});
		});

		describe('when result is object', () => {
			beforeEach(() => {
				print({ json: true, pretty: true }).call({ log }, objectToPrint);
				return Promise.resolve();
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).to.be.calledWithExactly(
					objectToPrintWithoutANSI,
					undefined,
					'\t',
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).to.be.calledWithExactly(stringifyResult);
			});
		});
	});
});
