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
 */
'use strict';

describe('system', () => {
	describe('constructor', () => {
		describe('library', () => {
			it('should assign logger');

			it('should assign db');

			it('should assign config.version');

			it('should assign config.wsPort');

			it('should assign config.version');

			it('should assign config.nethash');

			it('should assign config.minVersion');

			it('should assign config.nonce');
		});

		describe('__private', () => {
			describe('os', () => {
				it('should call platform on os library');

				it('should call release on os library');

				it('should assign os as concat of os.platform and os.release results');
			});

			it('should assign version from config.version');

			it('should assign port from config.wsPort');

			it('should assign httpPort from config.httpPort');

			it('should assign height = 1');

			it('should assign nethash from config.nethash');

			it('should assign broadhash from config.nethash');

			it('should assign minVersion from config.minVersion');

			it('should assign nonce from config.nonce');
		});

		describe('version', () => {
			describe('when version contains a letter', () => {
				it('should assign this.minVersion without any letter');

				it('should assign the last character to this.minVersionChar');
			});
		});

		it('should return error = null');

		it('should return the System instance');
	});

	describe('static', () => {
		describe('setHeaders', () => {
			it('should assign the argument to __private');
		});

		describe('getHeaders', () => {
			it('should return __private');
		});
	});

	describe('getOS', () => {
		it('should __private.os');
	});

	describe('getVersion', () => {
		it('should __private.version');
	});

	describe('getPort', () => {
		it('should __private.wsPort');
	});

	describe('getHeight', () => {
		it('should __private.height');
	});

	describe('getNethash', () => {
		it('should __private.nethash');
	});

	describe('getNonce', () => {
		it('should __private.nonce');
	});

	describe('getBroadhash', () => {
		describe('when argument is not a function', () => {
			it('should __private.broadhash');
		});

		describe('when argument is a function', () => {
			it('should call db.query with sql.getBroadhash');

			it('should call db.query with limit = 5');

			describe('when db.query fails', () => {
				it('should call callback with error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', () => {
				describe('and returns no or one result', () => {
					it('should call callback with error = null');

					it('should call callback with __private.nethash');
				});

				describe('and returns more then one results', () => {
					it('should call crypto.createHash with sha256');

					it('should call crypto.update with concatenation of results ids');

					it('should call crypto.update with utf-8');

					it('should call crypto.digest');

					it('should call callback with error = null');

					it('should call callback with the hash');
				});
			});
		});
	});

	describe('getMinVersion', () => {
		it('should __private.minVersion');
	});

	describe('networkCompatible', () => {
		it('should return true if argument is equal to __private.nethash');

		it('should return false if argument is not equal to __private.nethash');
	});

	describe('versionCompatible', () => {
		describe('when version contains', () => {
			describe('when system version contains a letter', () => {
				it(
					'should return true if both version number and version letter are equals with system'
				);

				it(
					'should return false if both version number and version letter are different than system'
				);

				it('should return false if version number is different than system');

				it('should return false if version letter is different than system');
			});

			describe('when system version does not contain a letter', () => {
				it('should call semver.satisfies with system minVersion');

				it('should call semver.satisfies with version with stripped letter');

				it('should call semver.satisfies with version with stripped letters');
			});
		});

		describe('when version without a letter passed', () => {
			it('should call semver.satisfies with system minVersion');

			it('should call semver.satisfies with version');
		});
	});

	describe('nonceCompatible', () => {
		it('should return if nonce exists and is different than the system nonce');

		it('should return false if nonce does not exist');

		it('should return false if nonce exists and is equal to the system nonce');
	});

	describe('update', () => {
		it('should call getBroadhash with function');

		it('should update __private.broadhash when getBroadhash returns no error');

		it(
			'should not update __private.broadhash when getBroadhash returns an error'
		);

		it('should call modules.blocks.lastBlock.get');

		it(
			'should update __private.height height property of modules.blocks.lastBlock.get result'
		);

		it('should call the logger.debug system headers info');

		it('should call modules.transport.headers with __private');

		it('should call callback');

		it('should never call callback with an error');
	});

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign blocks');

			it('should assign transport');
		});
	});
});
