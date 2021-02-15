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
import { print, StringMap } from '../../src/utils/print';
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
		{ lisk: 'Some suffix: \u001B[4awesome\u001B[0m' },
	];
	const arrayToPrintWithoutANSI = [{ lisk: 'Some prefix: JS' }, { lisk: 'Some suffix: awesome' }];

	const tablifyResult = 'tablify-result';
	const stringifyResult = '[{"lisk":"Some prefix: JS"},{"lisk":"Some suffix: awesome"}]';

	type Printer = (result: ReadonlyArray<StringMap> | StringMap) => void;
	let log: jest.Mock;

	beforeEach(() => {
		jest.spyOn(tablifyUtil, 'tablify').mockReturnValue(tablifyResult as any);
		jest.spyOn(JSON, 'stringify').mockReturnValue(stringifyResult);
		log = jest.fn();
	});

	describe('when json and pretty are false', () => {
		let printer: Printer;
		beforeEach(() => {
			printer = print();
		});

		describe('when result is array', () => {
			it('should call tablify with the ANSI', () => {
				printer(arrayToPrint);
				return expect(tablifyUtil.tablify).toHaveBeenCalledWith(arrayToPrint);
			});
		});

		describe('when there is log on the context', () => {
			it('should call tablify with the result and call the log of the context', () => {
				printer.call({ log }, arrayToPrint);
				expect(tablifyUtil.tablify).toHaveBeenCalledWith(arrayToPrint);
				return expect(log).toHaveBeenCalledWith(tablifyResult);
			});
		});
	});

	describe('when json is true and pretty is false and the context has a log method', () => {
		describe('when result is array', () => {
			beforeEach(() => {
				print({ json: true }).call({ log }, arrayToPrint);
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).toHaveBeenCalledWith(
					arrayToPrintWithoutANSI,
					undefined,
					undefined,
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).toHaveBeenCalledWith(stringifyResult);
			});
		});

		describe('when result is object', () => {
			beforeEach(() => {
				print({ json: true }).call({ log }, objectToPrint);
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).toHaveBeenCalledWith(
					objectToPrintWithoutANSI,
					undefined,
					undefined,
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).toHaveBeenCalledWith(stringifyResult);
			});
		});
	});

	describe('when json and pretty are true and the context has a log method', () => {
		describe('when result is array', () => {
			beforeEach(() => {
				print({ json: true, pretty: true }).call({ log }, arrayToPrint);
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).toHaveBeenCalledWith(
					arrayToPrintWithoutANSI,
					undefined,
					'\t',
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).toHaveBeenCalledWith(stringifyResult);
			});
		});

		describe('when result is object', () => {
			beforeEach(() => {
				print({ json: true, pretty: true }).call({ log }, objectToPrint);
			});

			it('should call JSON.stringify without the ANSI', () => {
				return expect(JSON.stringify).toHaveBeenCalledWith(
					objectToPrintWithoutANSI,
					undefined,
					'\t',
				);
			});

			it('should call the log of the context with result of stringify', () => {
				return expect(log).toHaveBeenCalledWith(stringifyResult);
			});
		});
	});
});
