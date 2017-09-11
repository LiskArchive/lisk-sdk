'use strict';

describe('dapps', function () {

	describe('__private', function () {

		describe('get', function () {

			it('should call library.db.query with valid params');

			it('should return an error when dapp not found');

			it('should return a dapp record when exists in db');

			describe('when db query fails', function () {

				it('should return the DApp#get error');
				
				it('should call the logger.error with error stack');
			});
		});
		
		describe('list', function () {

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

			describe('when filter.orderBy exists', function () {

				it('should call OrderBy with filter.orderBy param');

			});

			describe('when filter.orderBy does not exist', function () {

				it('should call OrderBy with undefined');
			});

			describe('when OrderBy returns the object with error property', function () {

				it('should return the error from OrderBy');

				it('should not call db.query');
			});

			describe('when OrderBy succeeds', function () {

				it('should call sql.list with returned sortField');

				it('should call sql.list with returned sortMethod');
			});

			describe('when db.query fails', function () {

				it('should return an error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', function () {

				it('should return error = null');

				it('should return the records');
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

	describe('internal', function () {

		describe('get', function () {

			it('should call __private.get with param.id');

			describe('when __private.get succeeds', function () {

				it('should return error = null');

				it('should return success: true');

				it('should return dapp object');
			});

			describe('when __private.get fails', function () {

				it('should return error = null');

				it('should return success: false');

				it('should return error');
			});
		});

		describe('list', function () {

			it('should call __private.list with query');

			describe('when __private.list succeeds', function () {

				it('should return error = null');

				it('should return success = true');

				it('should return dapps array');
			});

			describe('when __private.list fails', function () {

				it('should return error');
			});
		});

		describe('categories', function () {

			it('should return error = null');

			it('should return success = true');

			it('should return dappsCategories');
		});
	});

	describe('shared', function () {

		describe('getGenesis', function () {

			it('should call db.query with sql.getGenesis query');

			it('should call db.query with dappid');

			describe('when db.query fails', function () {

				it('should return the DApp#getGenesis error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', function () {

				describe('and returns no results', function () {

					it('should return an error');
				});

				describe('and returns results', function () {

					it('should return error = null');

					it('should return the record with pointId');

					it('should return the record with pointHeight');

					it('should return the record with authorId');

					it('should return the record with dappid');
				});
			});
		});
	});
});
