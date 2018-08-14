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
import {
	checkPublicKeysForDuplicates,
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getTimeFromBlockchainEpoch,
	getTimeWithOffset,
	getTransactionBytes,
	getTransactionHash,
	getTransactionId,
	prepareTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	signRawTransaction,
	signTransaction,
	multiSignTransaction,
	verifyTransaction,
	validateAddress,
	validateAmount,
	isValidInteger,
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,
	wrapTransactionCreator,
	validateTransaction,
} from '../../src/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have checkPublicKeysForDuplicates', () => {
			return expect(checkPublicKeysForDuplicates).to.be.a('function');
		});

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

		it('should have getTransactionBytes', () => {
			return expect(getTransactionBytes).to.be.a('function');
		});

		it('should have getTransactionHash', () => {
			return expect(getTransactionHash).to.be.a('function');
		});

		it('should have getTransactionId', () => {
			return expect(getTransactionId).to.be.a('function');
		});

		it('should have prepareTransaction', () => {
			return expect(prepareTransaction).to.be.a('function');
		});

		it('should have prependMinusToPublicKeys', () => {
			return expect(prependMinusToPublicKeys).to.be.a('function');
		});

		it('should have prependPlusToPublicKeys', () => {
			return expect(prependPlusToPublicKeys).to.be.a('function');
		});

		it('should have signRawTransaction', () => {
			return expect(signRawTransaction).to.be.a('function');
		});

		it('should have signTransaction', () => {
			return expect(signTransaction).to.be.a('function');
		});

		it('should have multiSignTransaction', () => {
			return expect(multiSignTransaction).to.be.a('function');
		});

		it('should have verifyTransaction', () => {
			return expect(verifyTransaction).to.be.a('function');
		});

		it('should have validateAddress', () => {
			return expect(validateAddress).to.be.a('function');
		});

		it('should have validateAmount', () => {
			return expect(validateAmount).to.be.a('function');
		});

		it('should have isValidInteger', () => {
			return expect(isValidInteger).to.be.a('function');
		});

		it('should have validateKeysgroup', () => {
			return expect(validateKeysgroup).to.be.a('function');
		});

		it('should have validatePublicKey', () => {
			return expect(validatePublicKey).to.be.a('function');
		});

		it('should have validatePublicKeys', () => {
			return expect(validatePublicKeys).to.be.a('function');
		});

		it('should have wrapTransactionCreator', () => {
			return expect(wrapTransactionCreator).to.be.a('function');
		});

		it('should have validateTransaction', () => {
			return expect(validateTransaction).to.be.a('function');
		});
	});
});
