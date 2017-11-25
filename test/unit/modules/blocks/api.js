'use strict';

describe('blocks/api', function () {

	describe('__private', function () {

		describe('getById', function () {

			it('should call library.db.query with valid params');

			it('should call callback with an error when dapp not found');

			it('should call callback with a dapp record when exists in db');

			describe('when db query fails', function () {

				it('should call callback with the Blocks#getById error');

				it('should call logger.error with error stack');
			});

			describe('when db.query succeeds', function () {

				describe('and returns no results', function () {

					it('should call callback with an error');
				});

				describe('and returns results', function () {

					it('should call library.logic.block.dbRead with first result');

					it('should call callback with error = null');

					it('should call callback with block as result');
				});
			});
		});

		describe('list', function () {

			describe('when filter.generatorPublicKey exists', function () {

				it('should call db.query with generatorPublicKey param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.numberOfTransactions exists', function () {

				it('should call db.query with numberOfTransactions param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.previousBlock exists', function () {

				it('should call db.query with previousBlock param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.height >= 0', function () {

				it('should call db.query with height param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.totalAmount >= 0', function () {

				it('should call db.query with totalAmount param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.type >= 0', function () {

				it('should call db.query with type param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.totalFee >= 0', function () {

				it('should call db.query with totalFee param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.reward >= 0', function () {

				it('should call db.query with reward param');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.limit exists', function () {

				it('should call db.query with limit param');

				it('should take an absolute from limit as number');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.limit does not exist', function () {

				it('should call db.query with limit = 100');
			});

			describe('when filter.offset > 100', function () {

				it('should return an error');

				it('should not call db.query');
			});

			describe('when filter.offset exists', function () {

				it('should call db.query with offset param');

				it('should take an absolute from offset as number');

				describe('when db.query succeeds', function () {

					it('should call sql.list with generatorPublicKey filter in where');

					it('should call db.query with generatorPublicKey param once again');
				});
			});

			describe('when filter.offset does not exist', function () {

				it('should call db.query with offset = 0');
			});

			describe('when filter.sort exists', function () {

				it('should call sortBy with filter.sort param');
			});

			describe('when filter.sort does not exist', function () {

				it('should call sortBy with height:desc');
			});

			describe('when sortBy returns the object with error property', function () {

				it('should return the error from sortBy');

				it('should not call db.query');
			});

			describe('when sortBy succeeds', function () {

				it('should call db.query');

				describe('when second db.query succeeds', function () {

					it('should call callback with error = null');

					describe('and returns no results', function () {

						it('should call callback with result containing blocks = []');
					});

					describe('and returns results', function () {

						it('should call library.logic.block.dbRead with every result');

						it('should call callback with error = null');

						it('should call callback with result containing blocks');
					});
				});

				describe('when db.query fails', function () {

					it('should call callback with Blocks#list error');

					it('should call logger.error with error stack');
				});
			});
		});
	});

	describe('getBlock', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call library.schema.validate with req.body');

			it('should call library.schema.validate with schema.getBlock');

			describe('when library.schema.validate fails', function () {

				it('should call callback with schema error message');
			});

			describe('when library.schema.validate succeeds', function () {

				it('should call library.dbSequence.add with callback');

				it('should call __private.getById with req.body.id');

				it('should call __private.getById with callback');

				describe('when __private.getById fails', function () {

					it('should call callback with error');
				});

				describe('when __private.getById succeeds', function () {

					describe('and returns no results', function () {

						it('should call callback with error');
					});

					describe('and returns results', function () {

						it('should call callback with error = null');

						it('should call callback with result containing block');
					});
				});
			});
		});
	});

	describe('getBlocks', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call library.schema.validate with req.body');

			it('should call library.schema.validate with schema.getBlocks');

			describe('when library.schema.validate fails', function () {

				it('should call callback with schema error message');
			});

			describe('when library.schema.validate succeeds', function () {

				it('should call library.dbSequence.add with callback');

				it('should call __private.list with req.body.id');

				it('should call __private.list with callback');

				describe('when __private.list fails', function () {

					it('should call callback with error');
				});

				describe('when __private.list succeeds', function () {

					it('should call callback with error = null');

					it('should call callback with result containing blocks');
				});
			});
		});
	});

	describe('getBroadhash', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.system.getBroadhash');

			it('should call callback with error = null');

			it('should call callback with result containing broadhash');
		});
	});

	describe('getEpoch', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should access constants.epochTime');

			it('should call callback with error = null');

			it('should call callback with result containing epoch');
		});
	});

	describe('getHeight', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.blocks.lastBlock.get');

			it('should call callback with error = null');

			it('should call callback with result containing height');
		});
	});

	describe('getFee', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call library.logic.block.calculateFee');

			it('should call callback with error = null');

			it('should call callback with result containing fee');
		});
	});

	describe('getFees', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should access constants.fees');

			it('should call callback with error = null');

			it('should call callback with result containing fees');
		});
	});

	describe('getNethash', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.system.getNethash');

			it('should call callback with error = null');

			it('should call callback with result containing nethash');
		});
	});

	describe('getMilestone', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.blocks.lastBlock.get');

			it('should call __private.blockReward.calcMilestone');

			it('should call callback with error = null');

			it('should call callback with result containing milestone');
		});
	});

	describe('getReward', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.blocks.lastBlock.get');

			it('should call __private.blockReward.calcReward');

			it('should call callback with error = null');

			it('should call callback with result containing reward');
		});
	});

	describe('getStatus', function () {

		describe('when __private.loaded = false', function () {

			it('should call callback with error');
		});

		describe('when __private.loaded = true', function () {

			it('should call modules.blocks.lastBlock.get');

			it('should call modules.system.getBroadhash');

			it('should access constants.epochTime');

			it('should call library.logic.block.calculateFee');

			it('should call __private.blockReward.calcMilestone');

			it('should call modules.system.getNethash');

			it('should call __private.blockReward.calcReward');

			it('should call __private.blockReward.calcSupply');

			it('should call callback with error = null');

			it('should call callback with result containing broadhash');

			it('should call callback with result containing epoch');

			it('should call callback with result containing height');

			it('should call callback with result containing fee');

			it('should call callback with result containing milestone');

			it('should call callback with result containing nethash');

			it('should call callback with result containing reward');

			it('should call callback with result containing supply');
		});
	});

	describe('onBind', function () {

		it('should call logger.trace with the message');

		it('should set __private.loaded = true');

		describe('modules', function () {

			it('should assign blocks');

			it('should assign system');
		});
	});
});
