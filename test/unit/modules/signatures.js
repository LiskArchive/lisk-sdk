'use strict';

describe('signatures', function () {

	describe('isLoaded', function () {

		it('should return true if modules exists');

		it('should return true if modules does not exist');
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign accounts');

			it('should assign transactions');

			it('should assign transport');
		});

		describe('assetTypes', function () {

			it('should call bind on signature logic with scope.accounts');
		});
	});

	describe('shared', function () {

		describe('postSignatures', function () {

			describe('when modules not are loaded', function () {

				it('should call callback with ApiError');

				it('should call callback with ApiError containing message = "Blockchain is loading"');

				it('should call callback with ApiError containing code = 500');
			});

			describe('when modules are loaded', function () {

				it('should call modules.transport.shared.postSignatures with req.body');

				describe('when modules.transport.shared.postSignatures fails with result', function () {

					it('should call callback with ApiError');

					it('should call callback with ApiError containing message = "Blockchain is loading"');

					describe('when result.message = "Invalid signatures body"', function () {

						it('should call callback with ApiError containing code = 400');
					});

					describe('when result.message != "Invalid signatures body"', function () {

						it('should call callback with ApiError containing code = 500');
					});
				});

				describe('when modules.transport.shared.postSignatures succeeds with result', function () {

					it('should call callback with error = null');

					it('should call callback with result containing status = "Signature Accepted"');
				});
			});
		});
	});
});
