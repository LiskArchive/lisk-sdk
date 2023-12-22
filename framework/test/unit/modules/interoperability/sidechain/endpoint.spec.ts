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

import { createTransientModuleEndpointContext } from '../../../../../src/testing';
import { SidechainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/sidechain/endpoint';
import { Types } from '../../../../../src';

describe('SidechainInteroperabilityEndpoint', () => {
	let endpoint: SidechainInteroperabilityEndpoint;

	const storesMock = {};
	const offchainStoresMock = {};

	beforeEach(() => {
		endpoint = new SidechainInteroperabilityEndpoint(storesMock as any, offchainStoresMock as any);
	});

	describe('getMainchainID', () => {
		let context: Types.ModuleEndpointContext;

		it('should throw error for chainID having less than 8 chars', () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '1234',
				},
			});

			// https://stackoverflow.com/questions/47397208/error-is-thrown-but-jests-tothrow-does-not-capture-the-error
			expect(() => endpoint.getMainchainID(context)).toThrow(
				"Property '.chainID' must NOT have fewer than 8 characters",
			);
		});

		it('should throw error for chainID having more than 8 chars', () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '123456789',
				},
			});

			expect(() => endpoint.getMainchainID(context)).toThrow(
				"Property '.chainID' must NOT have more than 8 characters",
			);
		});

		it('should return 00000000 for chainID 00123456', () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '00123456',
				},
			});

			const { mainchainID } = endpoint.getMainchainID(context);
			expect(mainchainID).toBe('00000000');
		});

		it('should return 02000000 for chainID 02345678', () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '02345678',
				},
			});

			const { mainchainID } = endpoint.getMainchainID(context);
			expect(mainchainID).toBe('02000000');
		});
	});
});
