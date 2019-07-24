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
import fs from 'fs';
import { readJSONSync, writeJSONSync } from '../../src/utils/fs';

describe('fs utils', () => {
	describe('#readJSONSync', () => {
		const fileContents = '{\n\t"lisk": "js",\n\t"version": 1\n}';
		const fileObject = {
			lisk: 'js',
			version: 1,
		};
		const path = './file/path.json';
		const encoding = 'utf8';
		let result: object;

		describe('when file does not include BOM', () => {
			beforeEach(() => {
				sandbox.stub(fs, 'readFileSync').returns(fileContents);
				sandbox.stub(JSON, 'parse').returns(fileObject);
				result = readJSONSync(path);
				return Promise.resolve();
			});

			it('fs.readFileSync should be called with the path and encoding', () => {
				return expect(fs.readFileSync).to.be.calledWithExactly(path, encoding);
			});

			it('JSON.parse should be called with the file contents as a string', () => {
				return expect(JSON.parse).to.be.calledWithExactly(fileContents);
			});

			it('the parsed file contents should be returned', () => {
				return expect(result).to.equal(fileObject);
			});
		});
		describe('when file includes BOM', () => {
			const BOM = '\uFEFF';
			const bomFileContents = `${BOM}${fileContents}`;
			beforeEach(() => {
				sandbox.stub(fs, 'readFileSync').returns(bomFileContents);
				sandbox.stub(JSON, 'parse').returns(fileObject);
				result = readJSONSync(path);
				return Promise.resolve();
			});

			it('fs.readFileSync should be called with the path and encoding', () => {
				return expect(fs.readFileSync).to.be.calledWithExactly(path, encoding);
			});

			it('JSON.parse should be called with the file contents as a string', () => {
				return expect(JSON.parse).to.be.calledWithExactly(fileContents);
			});

			it('the parsed file contents should be returned', () => {
				return expect(result).to.equal(fileObject);
			});
		});
	});

	describe('#writeJSONSync', () => {
		const writingObject = {
			lisk: 'js',
			version: 1,
		};
		const stringifiedObject = '{\n\t"lisk": "js",\n\t"version": 1\n}';
		const path = './path/to/write';

		beforeEach(() => {
			sandbox.stub(JSON, 'stringify').returns(stringifiedObject);
			sandbox.stub(fs, 'writeFileSync');
			writeJSONSync(path, writingObject);
			return Promise.resolve();
		});

		it('JSON.stringify should be called with the object using tab indentation', () => {
			return expect(JSON.stringify).to.be.calledWithExactly(
				writingObject,
				undefined,
				'\t',
			);
		});

		it('fs.writeFileSync should be called with the path and the stringified JSON"', () => {
			return expect(fs.writeFileSync).to.be.calledWithExactly(
				path,
				stringifiedObject,
			);
		});
	});
});
