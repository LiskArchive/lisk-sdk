/*
 * Copyright © 2024 Lisk Foundation
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
 */

describe('CCUHandler', () => {
	describe('load', () => {
		it.todo('Should set all the properties and calculate _outboxKeyForInclusionProof');
	});

	describe('computeCCU', () => {
		it.todo('should return if no certificate was found and last certificate heigt is 0');
		it.todo('should return undefined and log when no pending CCMs and no new certificate');
		it.todo('should return valid CCU params when there are pending CCMs with old certificate');
		it.todo(
			'should throw error when no validators data was found for validators hash from last certificate',
		);
		it.todo(
			'should throw error when no validators data was found for validators hash from new certificate',
		);
		it.todo('should throw error when no inclusion proof was found for the new certificate height');
		it.todo('should return valid CCU params for the new certificate with no CCMs');
		it.todo('should return valid CCU params for the new certificate with CCMs');
		it.todo('should return valid CCU params for the new certificate with activeValidatorsUpdate');
	});

	describe('submitCCU', () => {
		it.todo('should throw error if there is no privateKey');
		it.todo('should return undefined when the tx id is equal to last sent CCU');
		it.todo('should send CCU transaction and set CCU transaction in the DB');
	});

	describe('_findCertificate', () => {
		it.todo(
			'should return undefined if no aggregate commit is found when last certificate height is zero',
		);
		it.todo('should return first certificate when last certificate height is zero');
		it.todo(
			'should return undefined if getNextCertificateFromAggregateCommits returns no certificate',
		);
	});

	describe('_getCcuFee', () => {
		it.todo('should return min fee including initialization fee when no user account exists');
		it.todo('should return min fee excluding initialization fee when user account exists');
		it.todo('should return ccuFee when computed min fee is lower than ccuFee');
	});
});
