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
import {
	checkPublicKeysForDuplicates,
	getAddressAndPublicKeyFromRecipientData,
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
	validateKeysgroup,
	validatePublicKey,
	validatePublicKeys,
	wrapTransactionCreator,
} from '../../../src/transactions/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have checkPublicKeysForDuplicates', () => {
			return checkPublicKeysForDuplicates.should.be.type('function');
		});

		it('should have getAddressAndPublicKeyFromRecipientData', () => {
			return getAddressAndPublicKeyFromRecipientData.should.be.type('function');
		});

		it('should have getTimeFromBlockchainEpoch', () => {
			return getTimeFromBlockchainEpoch.should.be.type('function');
		});

		it('should have getTimeWithOffset', () => {
			return getTimeWithOffset.should.be.type('function');
		});

		it('should have getTransactionBytes', () => {
			return getTransactionBytes.should.be.type('function');
		});

		it('should have getTransactionHash', () => {
			return getTransactionHash.should.be.type('function');
		});

		it('should have getTransactionId', () => {
			return getTransactionId.should.be.type('function');
		});

		it('should have prepareTransaction', () => {
			return prepareTransaction.should.be.type('function');
		});

		it('should have prependMinusToPublicKeys', () => {
			return prependMinusToPublicKeys.should.be.type('function');
		});

		it('should have prependPlusToPublicKeys', () => {
			return prependPlusToPublicKeys.should.be.type('function');
		});

		it('should have signRawTransaction', () => {
			return signRawTransaction.should.be.type('function');
		});

		it('should have signTransaction', () => {
			return signTransaction.should.be.type('function');
		});

		it('should have multiSignTransaction', () => {
			return multiSignTransaction.should.be.type('function');
		});

		it('should have verifyTransaction', () => {
			return verifyTransaction.should.be.type('function');
		});

		it('should have validateAddress', () => {
			return validateAddress.should.be.type('function');
		});

		it('should have validateKeysgroup', () => {
			return validateKeysgroup.should.be.type('function');
		});

		it('should have validatePublicKey', () => {
			return validatePublicKey.should.be.type('function');
		});

		it('should have validatePublicKeys', () => {
			return validatePublicKeys.should.be.type('function');
		});

		it('should have wrapTransactionCreator', () => {
			return wrapTransactionCreator.should.be.type('function');
		});
	});
});
