/*
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
import utils from '../../src/api/utils';

describe('api utils module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(utils).should.be.type('object');
		});

		it('should export trimObj function', () => {
			(utils).should.have.property('trimObj').be.type('function');
		});

		it('should export toQueryString function', () => {
			(utils).should.have.property('toQueryString').be.type('function');
		});
	});

	describe('#trimObj', () => {
		const { trimObj } = utils;

		it('should not trim strings', () => {
			const str = '  string ';
			const trimmedString = trimObj(str);
			(trimmedString).should.be.equal(str);
		});

		it('should convert integers to strings', () => {
			const trimmedInteger = trimObj(123);
			(trimmedInteger).should.be.eql('123');
		});

		it('should convert nested integers to strings', () => {
			const trimmedObject = trimObj({ myObj: 2 });
			(trimmedObject).should.be.eql({ myObj: '2' });
		});

		it('should remove whitespace from keys and values', () => {
			const trimmedObject = trimObj({ '  my_Obj ': '  my val ' });
			(trimmedObject).should.be.eql({ my_Obj: 'my val' }); // eslint-disable-line camelcase
		});

		it('should trim each member of an array', () => {
			const trimmedArray = trimObj(['  string ', { ' key  ': ' value   ' }, ['  array item ']]);
			(trimmedArray).should.be.eql(['string', { key: 'value' }, ['array item']]);
		});
	});

	describe('#toQueryString', () => {
		const { toQueryString } = utils;

		it('should create a query string from an object', () => {
			const queryString = toQueryString({
				key1: 'value1',
				key2: 'value2',
				key3: 'value3',
			});
			(queryString).should.be.equal('key1=value1&key2=value2&key3=value3');
		});

		it('should escape invalid special characters', () => {
			const queryString = toQueryString({
				'key:/;?': 'value:/;?',
			});
			(queryString).should.be.equal('key%3A%2F%3B%3F=value%3A%2F%3B%3F');
		});
	});
});
