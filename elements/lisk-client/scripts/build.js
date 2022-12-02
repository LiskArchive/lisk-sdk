/*
 * Copyright © 2021 Lisk Foundation
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
 *
 */

const browserify = require('browserify');
const fs = require('fs');

const bundle = async () => {
	const browserDir = './dist-browser';
	if (!fs.existsSync(browserDir)) {
		fs.mkdirSync(browserDir);
	}
	// https://github.com/browserify/browserify/pull/1826
	// Browserify will ignore the buildins when "browser" field is specified
	// To migigate this problem, package.json is copied and updated to remove the browser, so that during the package build, browser field is ignored
	fs.copyFileSync('./package.json', './package.json.bak');
	const packageJSON = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
	delete packageJSON.browser;

	fs.writeFileSync('./package.json', JSON.stringify(packageJSON, undefined, '\t'));

	// All dependencies are indirectly existing from browserify
	const b = browserify('./dist-node/index.js', {
		builtins: {
			assert: require.resolve('assert/'),
			buffer: require.resolve('buffer/'),
			child_process: require.resolve('./_empty.js'),
			cluster: require.resolve('./_empty.js'),
			console: require.resolve('console-browserify'),
			constants: require.resolve('constants-browserify'),
			crypto: require.resolve('crypto-browserify'),
			dgram: require.resolve('./_empty.js'),
			dns: require.resolve('./_empty.js'),
			domain: require.resolve('domain-browser'),
			events: require.resolve('events/'),
			fs: require.resolve('./_empty.js'),
			http: require.resolve('stream-http'),
			https: require.resolve('https-browserify'),
			http2: require.resolve('./_empty.js'),
			inspector: require.resolve('./_empty.js'),
			module: require.resolve('./_empty.js'),
			net: require.resolve('./_empty.js'),
			os: require.resolve('os-browserify/browser.js'),
			path: require.resolve('path-browserify'),
			perf_hooks: require.resolve('./_empty.js'),
			punycode: require.resolve('punycode/'),
			querystring: require.resolve('querystring-es3/'),
			readline: require.resolve('./_empty.js'),
			repl: require.resolve('./_empty.js'),
			stream: require.resolve('stream-browserify'),
			_stream_duplex: require.resolve('readable-stream/duplex.js'),
			_stream_passthrough: require.resolve('readable-stream/passthrough.js'),
			_stream_readable: require.resolve('readable-stream/readable.js'),
			_stream_transform: require.resolve('readable-stream/transform.js'),
			_stream_writable: require.resolve('readable-stream/writable.js'),
			string_decoder: require.resolve('string_decoder/'),
			sys: require.resolve('util/util.js'),
			timers: require.resolve('timers-browserify'),
			tls: require.resolve('./_empty.js'),
			tty: require.resolve('tty-browserify'),
			url: require.resolve('url/'),
			util: require.resolve('util/util.js'),
			vm: require.resolve('vm-browserify'),
			zlib: require.resolve('browserify-zlib'),
			_process: require.resolve('process/browser'),
			zeromq: require.resolve('./_empty.js'),
		},
		standalone: 'lisk',
	});

	await new Promise((resolve, reject) => {
		b.bundle()
			.on('end', () => {
				fs.copyFileSync('./package.json.bak', './package.json');
				fs.rmSync('./package.json.bak');
				resolve();
			})
			.on('error', err => {
				reject(err);
			})
			.pipe(fs.createWriteStream('./dist-browser/index.js'));

		if (process.env.NODE_ENV) {
			b.on('update', bundle);
		}
	});
};

(async () => {
	await bundle();
})();
