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
import {
	COMMAND_TYPES,
	PLURALS,
	QUERY_INPUT_MAP,
	CONFIG_VARIABLES,
	API_PROTOCOLS,
	NETHASHES,
	SORT_FIELDS,
} from '../../src/utils/constants';

describe('constants utils', () => {
	describe('COMMAND_TYPES', () => {
		it('should be an array', () => {
			return expect(COMMAND_TYPES).to.be.an('array');
		});

		it('should not be empty', () => {
			return expect(COMMAND_TYPES).not.to.be.empty;
		});
	});

	describe('PLURALS', () => {
		it('should be an object', () => {
			return expect(PLURALS).to.be.an('object');
		});

		it('should not be empty', () => {
			return expect(PLURALS).not.to.be.empty;
		});
	});

	describe('QUERY_INPUT_MAP', () => {
		it('should be an object', () => {
			return expect(QUERY_INPUT_MAP).to.be.an('object');
		});

		it('should not be empty', () => {
			return expect(QUERY_INPUT_MAP).not.to.be.empty;
		});
	});

	describe('CONFIG_VARIABLES', () => {
		it('should be an array', () => {
			return expect(CONFIG_VARIABLES).to.be.an('array');
		});

		it('should not be empty', () => {
			return expect(CONFIG_VARIABLES).not.to.be.empty;
		});
	});

	describe('API_PROTOCOLS', () => {
		it('should be an array', () => {
			return expect(API_PROTOCOLS).to.be.an('array');
		});

		it('should not be empty', () => {
			return expect(API_PROTOCOLS).not.to.be.empty;
		});
	});

	describe('NETHASHES', () => {
		it('should be an object', () => {
			return expect(NETHASHES).to.be.an('object');
		});

		it('should not be empty', () => {
			return expect(NETHASHES).not.to.be.empty;
		});
	});

	describe('SORT_FIELDS', () => {
		it('should be an array', () => {
			return expect(SORT_FIELDS).to.be.an('array');
		});

		it('should not be empty', () => {
			return expect(SORT_FIELDS).not.to.be.empty;
		});
	});
});
