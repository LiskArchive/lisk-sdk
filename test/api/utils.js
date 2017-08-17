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

describe('api utils', () => {
	const port = 7000;

	describe('#trimObj', () => {
		const untrimmedObj = {
			' my_Obj ': ' myval ',
		};

		const trimmedObj = {
			my_Obj: 'myval', // eslint-disable-line camelcase
		};

		it('should not be equal before trim', () => {
			(untrimmedObj).should.not.be.equal(trimmedObj);
		});

		it('should be equal after trim an Object in keys and value', () => {
			const trimIt = utils.trimObj(untrimmedObj);

			(trimIt).should.be.eql(trimmedObj);
		});

		it('should accept numbers and strings as value', () => {
			const obj = {
				myObj: 2,
			};

			const trimmedObjWithNumberValue = utils.trimObj(obj);
			(trimmedObjWithNumberValue).should.be.ok();
			(trimmedObjWithNumberValue).should.be.eql({ myObj: '2' });
		});
	});

	describe('#extend', () => {
		const defaultOptions = {
			testnet: false,
			ssl: false,
			randomPeer: true,
			node: null,
			port: null,
			nethash: null,
			bannedPeers: [],
		};

		const options = {
			ssl: true,
			port,
			testnet: true,
		};

		it('should extend obj1 by obj2 and not modify original obj1', () => {
			const result = utils.extend(defaultOptions, options);

			(result).should.be.eql({
				testnet: true,
				ssl: true,
				randomPeer: true,
				node: null,
				port,
				nethash: null,
				bannedPeers: [],
			});
			(result).should.be.not.eql(defaultOptions);
		});
	});

	describe('#toQueryString', () => {
		it('should create a http string from an object. Like { obj: "myval", key: "myval" } -> obj=myval&key=myval', () => {
			const myObj = {
				obj: 'myval',
				key: 'my2ndval',
			};

			const serialised = utils.toQueryString(myObj);

			(serialised).should.be.equal('obj=myval&key=my2ndval');
		});
	});
});
