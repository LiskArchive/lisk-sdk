'use strict';

describe('system', function () {

	describe('constructor', function () {

		describe('library', function () {

			it('should assign logger');

			it('should assign db');

			it('should assign config.version');

			it('should assign config.port');

			it('should assign config.version');

			it('should assign config.nethash');

			it('should assign config.minVersion');

			it('should assign config.nonce');
		});

		describe('__private', function () {

			describe('os', function () {

				it('should call platform on os library');

				it('should call release on os library');

				it('should assign os as concat of os.platform and os.release results');
			});

			it('should assign version from config.version');

			it('should assign port from config.port');

			it('should assign httpPort from config.httpPort');

			it('should assign height = 1');

			it('should assign nethash from config.nethash');

			it('should assign broadhash from config.nethash');

			it('should assign minVersion from config.minVersion');

			it('should assign nonce from config.nonce');
		});

		describe('version', function () {

			describe('when version contains a letter', function () {

				it('should assign this.minVersion without any letter');

				it('should assign the last character to this.minVersionChar');
			});
		});

		it('should return error = null');

		it('should return the System instance');
	});

	describe('static', function () {

		describe('setHeaders', function () {

			it('should assign the argument to __private');
		});

		describe('getHeaders', function () {

			it('should return __private');
		});
	});

	describe('getOS', function () {

		it('should __private.os');
	});

	describe('getVersion', function () {

		it('should __private.version');
	});

	describe('getPort', function () {

		it('should __private.port');
	});

	describe('getHeight', function () {

		it('should __private.height');
	});

	describe('getNethash', function () {

		it('should __private.nethash');
	});

	describe('getNonce', function () {

		it('should __private.nonce');
	});

	describe('getBroadhash', function () {

		describe('when argument is not a function', function () {

			it('should __private.broadhash');
		});

		describe('when argument is a function', function () {

			it('should call db.query with sql.getBroadhash');

			it('should call db.query with limit = 5');

			describe('when db.query fails', function () {

				it('should return an error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', function () {

				describe('and returns no or one result', function () {

					it('should return error = null');

					it('should return __private.nethash');
				});

				describe('and returns more then one results', function () {

					it('should call crypto.createHash with sha256');

					it('should call crypto.update with concatenation of results ids');

					it('should call crypto.update with utf-8');

					it('should call crypto.digest');

					it('should return the hash');

					it('should return error = null');
				});
			});
		});
	});

	describe('getMinVersion', function () {

		it('should __private.minVersion');
	});

	describe('networkCompatible', function () {

		it('should return true if argument is equal to __private.nethash');

		it('should return false if argument is not equal to __private.nethash');
	});

	describe('versionCompatible', function () {

		describe('when version contains', function () {

			describe('when system version contains a letter', function () {

				it('should return true if both version number and version letter are equals with system');

				it('should return false if both version number and version letter are different than system');

				it('should return false if version number is different than system');

				it('should return false if version letter is different than system');
			});

			describe('when system version does not contain a letter', function () {

				it('should call semver.satisfies with system minVersion');

				it('should call semver.satisfies with version with stripped letter');

				it('should call semver.satisfies with version with stripped letters');
			});
		});

		describe('when version without a letter passed', function () {

			it('should call semver.satisfies with system minVersion');

			it('should call semver.satisfies with version');
		});
	});

	describe('nonceCompatible', function () {

		it('should return if nonce exists and is different than the system nonce');

		it('should return false if nonce does not exist');

		it('should return false if nonce exists and is equal to the system nonce');
	});

	describe('update', function () {

		it('should call getBroadhash with function');

		it('should update __private.broadhash when getBroadhash returns no error');

		it('should not update __private.broadhash when getBroadhash returns an error');

		it('should call modules.blocks.lastBlock.get');

		it('should update __private.height height property of modules.blocks.lastBlock.get result');

		it('should call the logger.debug system headers info');

		it('should call modules.transport.headers with __private');

		it('should never return an error');
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign blocks');

			it('should assign transport');
		});
	});
});
