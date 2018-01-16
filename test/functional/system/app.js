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

var application = require('../../common/application');

describe('app', function () {

	it('init successfully without any error', function (done) {
		application.init({sandbox: {name: 'lisk_test_app'}}, function (err, scope) {
			done(err);
		});
	});

	it('cleanup sandboxed application successfully', function (done) {
		application.cleanup(done);
	});
});
