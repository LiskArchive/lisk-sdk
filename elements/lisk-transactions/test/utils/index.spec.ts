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
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getTimeFromBlockchainEpoch,
	getTimeWithOffset,
	getId,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateMultisignatures,
	validateSignature,
} from '../../src/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have convertBeddowsToLSK', () => {
			return expect(convertBeddowsToLSK).to.be.a('function');
		});

		it('should have convertLSKToBeddows', () => {
			return expect(convertLSKToBeddows).to.be.a('function');
		});

		it('should have getTimeFromBlockchainEpoch', () => {
			return expect(getTimeFromBlockchainEpoch).to.be.a('function');
		});

		it('should have getTimeWithOffset', () => {
			return expect(getTimeWithOffset).to.be.a('function');
		});

		it('should have getId', () => {
			return expect(getId).to.be.a('function');
		});

		it('should have prependMinusToPublicKeys', () => {
			return expect(prependMinusToPublicKeys).to.be.a('function');
		});

		it('should have prependPlusToPublicKeys', () => {
			return expect(prependPlusToPublicKeys).to.be.a('function');
		});

		it('should have verifySignature', () => {
			return expect(validateSignature).to.be.a('function');
		});

		it('should have verifyMultisignatures', () => {
			return expect(validateMultisignatures).to.be.a('function');
		});
	});
});
