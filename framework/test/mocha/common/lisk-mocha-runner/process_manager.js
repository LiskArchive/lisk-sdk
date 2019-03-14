const child_process = require('child_process');

const MOCHA_PATH = process.env.MOCHA_PATH || 'node_modules/.bin/_mocha';
const ISTANBUL_PATH = process.env.MOCHA_PATH || 'node_modules/.bin/istanbul';

const children = {};

const promisifyChild = child => {
	let error = null;
	child.once('error', err => {
		error = err;
		return child.kill('SIGTERM');
	});

	return new Promise((resolve, reject) => {
		child.once('exit', code => {
			// We need to delete the child process from the queue once it exists.
			delete children[child.pid];
			if (code === 0) {
				return resolve();
			}

			return reject(code, error);
		});
	});
};

const getIstanbulOptions = (testFile, mochaCliOptions) => {
	return [
		'cover',
		'--dir',
		'framework/test/mocha/.coverage-unit',
		'--include-pid',
		'--print',
		'none',
		MOCHA_PATH,
		testFile,
		...mochaCliOptions,
	];
};

const spawn = (testFile, mochaCliOptions) => {
	const istanbulOptions = getIstanbulOptions(testFile, mochaCliOptions);

	const child = child_process.spawn(ISTANBUL_PATH, istanbulOptions, {
		cwd: `${__dirname}/../../../../..`,
		detached: true,
		stdio: 'inherit',
	});

	children[child.pid] = child;
	const istanbulOptionsStr = istanbulOptions.map(v => `"${v}"`).join(' ');
	console.info(`(${child.pid}) ${ISTANBUL_PATH} ${istanbulOptionsStr}`);

	return promisifyChild(child);
};

const killAll = () =>
	Object.values(children).forEach(child => child.kill('SIGINT'));

module.exports = {
	spawn,
	killAll,
};
