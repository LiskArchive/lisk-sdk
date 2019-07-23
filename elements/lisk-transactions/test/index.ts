/*
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
import * as transaction from '../src';

describe('transaction', () => {
	describe('exports', () => {
		it('should have #transfer', () => {
			return expect(transaction)
				.to.have.property('transfer')
				.and.be.a('function');
		});

		it('should have #registerMultisignature', () => {
			return expect(transaction)
				.to.have.property('registerMultisignature')
				.and.be.a('function');
		});

		it('should have #createSignatureObject', () => {
			return expect(transaction)
				.to.have.property('createSignatureObject')
				.and.be.a('function');
		});

		it('should have #utils', () => {
			return expect(transaction)
				.to.have.property('utils')
				.and.be.an('object');
		});

		it('should have #constants', () => {
			return expect(transaction)
				.to.have.property('constants')
				.and.be.an('object');
		});
	});
});
