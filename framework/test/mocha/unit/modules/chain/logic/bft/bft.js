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

const {
	BFT,
	validateBlockHeader,
	PROCESSING_THRESHOLD,
} = require('../../../../../../../src/modules/chain/logic/bft');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../fixtures/blocks');

const generateValidHeaders = count => {
	return [...Array(count)].map((_, index) => {
		return blockHeaderFixture({
			height: index + 1,
			maxHeightPreviouslyForged: index,
		});
	});
};

describe('bft', () => {
	describe('validateBlockHeader', () => {
		it('should be ok for valid headers', async () => {
			const header = blockHeaderFixture();
			expect(validateBlockHeader(header)).to.be.true;
		});

		it('should throw error if any header is not valid format', async () => {
			let header;

			// Setting non-integer value
			header = blockHeaderFixture({ height: '1' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);

			// Setting invalid id
			header = blockHeaderFixture({ blockId: 'Al123' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);

			// Setting invalid public key;
			header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);
		});
	});

	describe('BFT', () => {
		let bft;
		const finalizedHeight = 0;

		beforeEach(async () => {
			bft = new BFT({ finalizedHeight });
			sinonSandbox.stub(bft.headers, 'getBlockHeaderForDelegate');
		});

		describe('verifyBlockHeaders', () => {
			it('should throw error if prevotedConfirmedUptoHeight is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(PROCESSING_THRESHOLD + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });

				expect(() => bft.verifyBlockHeaders(header)).to.throw(
					'Wrong provtedConfirmedHeight in blockHeader.'
				);
			});

			it('should not throw error if prevotedConfirmedUptoHeight is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(PROCESSING_THRESHOLD + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });
				bft.prevotedConfirmedHeight = 10;

				expect(() => bft.verifyBlockHeaders(header)).to.not.throw;
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();
				bft.headers.getBlockHeaderForDelegate.returns(null);

				expect(bft.verifyBlockHeaders(header)).to.be.true;
			});

			it('should throw error if delegate forged block on different height', async () => {
				const maxHeightPreviouslyForged = 10;
				const lastBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 9,
				});

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
					'Violation of fork choice rule, delegate moved to different chain'
				);
			});

			it('should throw error if delegate forged block on same height', async () => {
				const maxHeightPreviouslyForged = 10;
				const lastBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
					'Violation of fork choice rule, delegate moved to different chain'
				);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', async () => {
				const lastBlock = blockHeaderFixture({
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged: 9,
				});

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
					'Violates disjointness condition'
				);
			});

			it('should throw error if prevotedConfirmedUptoHeight has wrong value', async () => {
				const lastBlock = blockHeaderFixture({
					prevotedConfirmedUptoHeight: 10,
					height: 9,
				});
				const currentBlock = blockHeaderFixture({
					prevotedConfirmedUptoHeight: 9,
					maxHeightPreviouslyForged: 9,
					height: 10,
				});

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
					'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(bft.verifyBlockHeaders(currentBlock)).to.be.true;
			});
		});
	});
});
