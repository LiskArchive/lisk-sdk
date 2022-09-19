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
 */

'use strict';

module.exports = {
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tsconfig.json',
		},
	},
	verbose: false,
	testMatch: ['<rootDir>/src/main.spec.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	/**
			coverageThreshold: {
				global: {
					branches: 50,
					functions: 50,
					lines: 50,
					statements: 50,
				},
			},
		*/

	/**
	 * restoreMocks [boolean]
	 *
	 * Default: false
	 *
	 * Automatically restore mock state between every test.
	 * Equivalent to calling jest.restoreAllMocks() between each test.
	 * This will lead to any mocks having their fake implementations removed
	 * and restores their initial implementation.
	 *
	 * IMPORTANT: Beware that mockFn.mockRestore only works when the mock was
	 * created with jest.spyOn. Thus you have to take care of restoration yourself
	 * when manually assigning jest.fn().
	 */
	restoreMocks: true,

	/**
	 * clearMocks [boolean]
	 *
	 * Default: false
	 *
	 * Automatically clear mock calls and instances between every test.
	 * Equivalent to calling jest.clearAllMocks() between each test.
	 * This does not remove any mock implementation that may have been provided.
	 */
	clearMocks: true,

	/**
	 * resetModules [boolean]
	 *
	 * Default: false
	 *
	 * By default, each test file gets its own independent module registry.
	 * Enabling resetModules goes a step further and resets the module registry before running each individual test.
	 * This is useful to isolate modules for every test so that local module state doesn't conflict between tests.
	 * This can be done programmatically using jest.resetModules().
	 */
	resetModules: true,
};
