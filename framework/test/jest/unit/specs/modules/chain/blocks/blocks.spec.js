describe('blocks', () => {
	describe('constructor', () => {
		it.todo('should initialize private variables correctly');
	});

	describe('lastBlock', () => {
		it.todo('return the _lastBlock without the receivedAt property');
	});

	describe('isActive', () => {
		it.todo('return the _isActive property');
	});

	describe('init', () => {
		describe('loadMemTables', () => {});

		describe('matchGenesisBlock', () => {
			it.todo('should throw an error if the genesis block is diffenrent');
		});

		describe('reloadRequired', () => {});

		describe('loadLastBlock', () => {});
	});

	describe('validate', () => {
		describe('validateSignature', () => {
			it.todo('should throw when the block bytes are mutated');
			it.todo('should throw when the block signature is mutated');
			it.todo('should throw when the block signature is mutated');
			it.todo('should throw when generator public key is different');
			// Question: should we have a test for passing block here or having one at the end validate function would suffice?
		});

		describe('validatePreviousBlock', () => {
			it.todo(
				"should throw when the previous block doesn't exist and the block is not genesis block",
			);
		});

		describe('validateReward', () => {
			// should not throw if block height === 1? (Where should the test go)
			it.todo(
				'should throw if the expected reward does not match the reward property in block object',
			);
			it.todo(
				'should not throw if the expected reward does not match the reward property in block object but the block id included in exception',
			);
			it.todo('should not throw if block height === 1');
		});

		describe('validatePayload', () => {
			it.todo(
				'should throw if the payload size is bigger than maxPayloadLength',
			);
			it.todo(
				'should throw if the transactions array is not equal to numberOfTransactions',
			);
			it.todo(
				'should throw if the transactions array is more than maxTransactionsPerBlock',
			);
			it.todo('should throw if there are duplicate transaction ids');
			it.todo(
				'should throw if the calculated payload hash is not equal to payloadHash property in block object',
			);
			it.todo(
				'should throw if the calculated totalAmount is not equal to totalAmount property in block object',
			);
			it.todo(
				'should throw if the calculated totalFee is not equal to totalFee property in block object',
			);
		});

		describe('valudateBlockSlot', () => {
			it.todo('should throw when block timestamp is in the future');
			it.todo(
				'should throw when block timestamp is earlier than lastBlock timestamp',
			);
			it.todo(
				'should throw when block timestamp is equal to the lastBlock timestamp',
			);
		});

		it.todo('should reassign the id property for block object');

		describe('validateTransactions', () => {
			// Question: What should be exactly done here
			it.todo('should call validateTransactions with expected parameters');
			it.todo('should throw errors of the first invalid Transaction');
			it.todo('should not throw when there are no errors');
		});
	});

	// TODO: decide first if we need this function
	describe('validateNew', () => {});

	describe('forkChoice', () => {
		// We must have these tests somewhere
	});

	describe('verify', () => {
		it.todo('should throw in case if block id exists in the last n blocks');
		it.todo('should throw in case if block id exists in the last n blocks');
	});

	describe('apply', () => {
		it.todo('should not perform any action if transactions is an empty array');
		it.todo('should not call apply transactions for inert transactions');
		it.todo('should throw the errors for first unappliable transactions');
		it.todo('should update account state when transactions are appliable');
		it.todo('should update round state when transactions are appliable');
	});

	describe('applyGenesis', () => {
		it.todo(
			'should call transactionsModule.applyGenesisTransactions by sorting transactions',
		);
		it.todo('should account state when transactions are appliable');
		it.todo('should round state when transactions are appliable');
	});

	describe('undo', () => {
		it.todo('should not perform any action if transactions is an empty array');
		it.todo('should not call undoTransactions for inert transactions');
		it.todo('should throw the errors for first unundoable transaction');
		it.todo('should update account state when transactions are reverted');
		it.todo('should update round state when transactions are reverted');
	});

	describe('save', () => {
		it.todo('should save the block in the database');
		it.todo('should throw error when block cannot be saved in the database');
		it.todo('should perform tick for rounds module');
	});

	describe('saveGenesis', () => {
		it.todo('should not save the block when skipSave is set to true');
		it.todo(
			'should save the block in the database when skipSave is set to false',
		);
		it.todo('should throw error when block cannot be saved in the database');
		it.todo('should perform tick for rounds module');
	});

	describe('remove', () => {
		it.todo('should throw an error when removing genesis block');
		it.todo(
			'should throw an error when previous block does not exist in the database',
		);
		it.todo('should throw an error when deleting block fails');
		it.todo(
			'should not create entry in temp block table saveToTemp flag is false',
		);
		describe('when saveToTemp parameter is set to true', () => {
			it.todo('should not mutate the last block object');
			it.todo(
				'should create entry in temp block with string value of reward if it exists',
			);
			it.todo(
				"should create entry in temp block without reward property if it does't exists",
			);
			it.todo(
				'should create entry in temp block with string value of totalAmount if it exists',
			);
			it.todo(
				"should create entry in temp block without totalAmount property if it does't exists",
			);
			it.todo(
				'should create entry in temp block with string value of totalFee if it exists',
			);
			it.todo(
				"should create entry in temp block without totalFee property if it does't exists",
			);
			it.todo(
				'should create entry in temp block by adding blockId property for transactions',
			);
			it.todo('should create entry in temp block with json transactions array');
			it.todo(
				'should create entry in temp block with correct id, height and block property and tx',
			);
		});
		it.todo(
			'should not create entry in temp block table if saveToTemp parameter is false',
		);
	});

	describe('exists', () => {
		it.todo("should return true if the block doesn't exist");
		it.todo('should return false if the block does exist');
	});

	describe('filterReadyTransactions', () => {});

	describe('broadcast', () => {
		it.todo('should clone block and emit EVENT_BROADCAST_BLOCK event');
	});

	describe('cleanup', () => {});

	describe('deleteLastBlockAndGet', () => {
		it.todo('should remove the last block');
		it.todo('should clone block and emit EVENT_BROADCAST_BLOCK event');
		it.todo('should throw in case removing block fails');
		it.todo('should return new last block');
	});

	describe.todo('loadBlocksDataWs', () => {});

	describe.todo('readBlocksFromNetwork', () => {});

	describe('getHighestCommonBlock', () => {
		it.todo(
			'should get the block with highest height in the blockchain if provided ids parameter is empty',
		);
		it.todo(
			'should get the block with highest height from provided ids parameter',
		);
		it.todo('should throw error if unable to get blocks from the storage');
	});
});
