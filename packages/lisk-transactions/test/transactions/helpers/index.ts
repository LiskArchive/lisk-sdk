/*
 * Copyright © 2018 Lisk Foundation
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
	checkTypes,
	getBytes,
	getId,
	verifyBalance,
	verifyMultisignatures,
	verifySignature,
} from '../../../src/transactions/helpers';

describe('transactions helpers', () => {
	describe('exports', () => {
		it('should have checkTypes', () => {
			return expect(checkTypes).to.be.a('function');
		});

		it('should have getBytes', () => {
			return expect(getBytes).to.be.a('function');
		});

		it('should have getId', () => {
			return expect(getId).to.be.a('function');
		});

		it('should have verifyBalance', () => {
			return expect(verifyBalance).to.be.a('function');
		});

		it('should have verifyMultisignatures', () => {
			return expect(verifyMultisignatures).to.be.a('function');
		});

		it('should have verifySignature', () => {
			return expect(verifySignature).to.be.a('function');
		});
	});
});
