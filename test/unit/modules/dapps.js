'use strict';

describe('dapps', function () {

	describe('__private', function () {

		describe('list', function () {

			describe('when filter.transactionId exists', function () {

				it('should call sql.list with transactionId filter in where');

				it('should call db.query with transactionId param');
			});

			describe('when filter.type >= 0', function () {

				it('should call sql.list with type filter in where');

				it('should call db.query with type param');
			});

			describe('when filter.name exists', function () {

				it('should call sql.list with name filter in where');

				it('should call db.query with name param');
			});

			describe('when filter.category exists', function () {
				/**
				 * ToDo: it is possible to list the undefined category
				 * when passed a one which is not present in dappCategories.
				 * Check should be replaced from
				 * category != null to category !== undefined
				 */

				describe('when filter.category is a valid dapp category', function () {

					it('should call sql.list with category filter in where');

					it('should call db.query with category param');
				});

				describe('when filter.category is a valid dapp category', function () {

					it('should return the error message');

					it('should not call db.query');
				});
			});

			describe('when filter.link exists', function () {

				it('should call sql.list with link filter in where');

				it('should call db.query with link param');
			});

			describe('when filter.limit exists', function () {

				it('should call sql.list with limit filter in where');

				it('should call db.query with limit param');

				it('should take an absolute from limit as number');
			});

			describe('when filter.limit does not exist', function () {

				it('should call db.query with limit = 100');
			});

			describe('when filter.offset > 100', function () {

				it('should return an error');

				it('should not call db.query');
			});

			describe('when filter.offset exists', function () {

				it('should call sql.list with offset filter in where');

				it('should call db.query with offset param');

				it('should take an absolute from offset as number');
			});

			describe('when filter.offset does not exist', function () {

				it('should call db.query with offset = 0');
			});

			describe('when filter.sort exists', function () {

				it('should call sortBy with filter.sort param');

			});

			describe('when filter.sort does not exist', function () {

				it('should call sortBy with undefined');
			});

			describe('when sortBy returns the object with error property', function () {

				it('should return the error from sortBy');

				it('should not call db.query');
			});

			describe('when sortBy succeeds', function () {

				it('should call sql.list with returned sortField');

				it('should call sql.list with returned sortMethod');
			});

			describe('when db.query fails', function () {

				it('should call callback with an error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', function () {

				it('should call callback with error = null');

				it('should call callback with the records as result');
			});
		});
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign transactions');

			it('should assign accounts');

			it('should assign peers');

			it('should assign sql');
		});

		describe('assetTypes', function () {

			it('should call bind on inTransfer logic with proper params');

			it('should call bind on outTransfer logic with proper params');
		});
	});

	describe('isLoaded', function () {

		it('should return true if modules exists');

		it('should return true if modules does not exist');
	});

	describe('shared', function () {

		describe('list', function () {

			it('should call __private.list with query');

			describe('when __private.list succeeds', function () {

				it('should call callback with error = null');

				it('should call callback with result containing dapps as an array');
			});

			describe('when __private.list fails', function () {

				it('should call callback with ApiError');

				it('should call callback with ApiError with code 500');
			});
		});
	});
	
	describe('shared.getGenesis', function () {

		it('should call db.query with sql.getGenesis query');

		it('should call db.query with dappid');

		describe('when db.query fails', function () {

			it('should call callback with the DApp#getGenesis error');

			it('should call the logger.error with error stack');
		});

		describe('when db.query succeeds', function () {

			describe('and returns no results', function () {

				it('should call callback with an error');
			});

			describe('and returns results', function () {

				it('should call callback with error = null');

				it('should call callback with result containing pointId');

				it('should call callback with result containing pointHeight');

				it('should call callback with result containing authorId');

				it('should call callback with result containing dappid');
			});
		});
	});
});
