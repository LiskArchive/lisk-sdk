/*
 * Copyright © 2023 Lisk Foundation
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

import {
	CHAIN_REGISTRATION_FEE,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';

describe('MainchainInteroperabilityEndpoint', () => {
	let endpoint: MainchainInteroperabilityEndpoint;

	const storesMock = {};
	const offchainStoresMock = {};

	beforeEach(() => {
		endpoint = new MainchainInteroperabilityEndpoint(storesMock as any, offchainStoresMock as any);
	});

	describe('getRegistrationFee', () => {
		it('should return the registration fee', () => {
			const result = endpoint.getRegistrationFee();

			expect(result).toEqual({ fee: CHAIN_REGISTRATION_FEE.toString() });
		});
	});

	describe('getMinimumMessageFee', () => {
		it('should return the message fee', () => {
			const result = endpoint.getMinimumMessageFee();

			expect(result).toEqual({ fee: MIN_RETURN_FEE_PER_BYTE_BEDDOWS.toString() });
		});
	});
});
