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

		describe('getFee', function () {

			it('should call callback with error = null');

			it('should call callback with fee taken from constants.fees.secondSignature');
		});

		describe('postSignatures', function () {

			it('should call modules.transport.shared.postSignatures with req.body and callback');
		});
	});
});
