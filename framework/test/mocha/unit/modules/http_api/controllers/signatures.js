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

const rewire = require('rewire');

const SignaturesController = rewire(
	'../../../../../../src/modules/http_api/controllers/signatures'
);

describe('signatures/api', () => {
	let postSignature;
    let channelStub;
    let contextStub;
    let nextStub;

	beforeEach(done => {
        channelStub = {
            invoke: sinonSandbox.stub().resolves({
                success: false,
                message: 'Error processing signature: Unable to process signature, corresponding transaction not found',
            }),
        }; // callsArgWith(1, [contextStub])
        nextStub = sinonSandbox.stub();
        contextStub = {
            request: {
                swagger: {
                    params: {
                        signature:
                        {
                            value: 'invalid signature',
                        },
                    },
                },
            },
        };

        postSignature = SignaturesController.postSignature;

        new SignaturesController({
			channel: channelStub,
        });
        done();
	});

	afterEach(() => {
        // channelStub.invoke.resolves();
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign channel', async () => {
			expect(SignaturesController.__get__('channel')).to.equal(channelStub);
		});
    });
    
    describe('postSignature', () => {
        try {
            const response = await postSignature(contextStub, (error) => {
                console.log('final');
                console.log(error.message);
            });
        } catch (err) {
            console.log(err);
        }
    })
});
