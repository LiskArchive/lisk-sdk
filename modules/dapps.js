/*jslint strict:false */

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var dappCategories = require('../helpers/dappCategories.js');
var dappTypes = require('../helpers/dappTypes.js');
var DecompressZip = require('decompress-zip');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var npm = require('npm');
var OrderBy = require('../helpers/orderBy.js');
var path = require('path');
var popsicle = require('popsicle');
var rmdir = require('rimraf');
var Router = require('../helpers/router.js');
var Sandbox = require('lisk-sandbox');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/dapps.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/dapps.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.launched = {};
__private.loading = {};
__private.uninstalling = {};
__private.appPath = process.cwd();
__private.dappsPath = path.join(process.cwd(), 'dapps');
__private.sandboxes = {};
__private.dappready = {};
__private.routes = {};

// Constructor
function DApps (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();

	var DApp = require('../logic/dapp.js');
	__private.assetTypes[transactionTypes.DAPP] = library.logic.transaction.attachAssetType(
		transactionTypes.DAPP, new DApp()
	);

	var InTransfer = require('../logic/inTransfer.js');
	__private.assetTypes[transactionTypes.IN_TRANSFER] = library.logic.transaction.attachAssetType(
		transactionTypes.IN_TRANSFER, new InTransfer()
	);

	var OutTransfer = require('../logic/outTransfer.js');
	__private.assetTypes[transactionTypes.OUT_TRANSFER] = library.logic.transaction.attachAssetType(
		transactionTypes.OUT_TRANSFER, new OutTransfer()
	);

	process.on('exit', function () {
		var keys = Object.keys(__private.launched);

		async.eachSeries(keys, function (id, eachSeriesCb) {
			if (!__private.launched[id]) {
				return setImmediate(eachSeriesCb);
			}

			__private.stop({
				transactionId: id
			}, function (err) {
				return setImmediate(eachSeriesCb, err);
			});
		}, function (err) {
			library.logger.error(err);
		});
	});

	fs.exists(path.join('.', 'public', 'dapps'), function (exists) {
		if (exists) {
			rmdir(path.join('.', 'public', 'dapps'), function (err) {
				if (err) {
					library.logger.error(err);
				}

				__private.createBasePathes(function (err) {
					return setImmediate(cb, err, self);
				});
			});
		} else {
			__private.createBasePathes(function (err) {
				return setImmediate(cb, null, self);
			});
		}
	});
}

__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.put('/', function (req, res, next) {
		req.sanitize(req.body, schema.put, function (err, report, body) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
			var keypair = library.ed.makeKeypair(hash);

			if (body.publicKey) {
				if (keypair.publicKey.toString('hex') !== body.publicKey) {
					return res.json({success: false, error: 'Invalid passphrase'});
				}
			}

			library.balancesSequence.add(function (cb) {
				modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Account not found');
					}

					if (account.secondSignature && !body.secondSecret) {
						return setImmediate(cb, 'Invalid second passphrase');
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = library.ed.makeKeypair(secondHash);
					}

					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.DAPP,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair,
							category: body.category,
							name: body.name,
							description: body.description,
							tags: body.tags,
							dapp_type: body.type,
							link: body.link,
							icon: body.icon
						});
					} catch (e) {
						return setImmediate(cb, e.toString());
					}

					modules.transactions.receiveTransactions([transaction], cb);
				});
			}, function (err, transaction) {
				if (err) {
					return res.json({success: false, error: err});
				}
				res.json({success: true, transaction: transaction[0]});
			});
		});
	});

	router.get('/', function (req, res, next) {
		req.sanitize(req.query, schema.list, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			__private.list(query, function (err, dapps) {
				if (err) {
					return res.json({success: false, error: 'Application not found'});
				}

				res.json({success: true, dapps: dapps});
			});
		});
	});

	router.get('/get', function (req, res, next) {
		req.sanitize(req.query, schema.get, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			__private.get(query.id, function (err, dapp) {
				if (err) {
					return res.json({success: false, error: err});
				}

				return res.json({success: true, dapp: dapp});
			});
		});
	});

	router.get('/search', function (req, res, next) {
		req.sanitize(req.query, schema.search, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			var params = { q: '%' + query.q + '%', limit: 50 };

			if (query.category) {
				if (query.category === 0 || query.category > 0) {
					params.category = query.category;
				}
			}

			library.db.query(sql.search(params), params).then(function (rows) {
				if (rows.length === 0) {
					return res.json({success: true, dapps: rows});
				}

				if (query.installed === null || typeof query.installed === 'undefined') {
					return res.json({success: true, dapps: rows});
				} else if (query.installed === 1) {
					__private.getInstalledIds(function (err, installed) {
						if (err) {
							return res.json({
								success: false,
								error: 'Failed to get installed ids'
							});
						}

						var dapps = [];

						rows.forEach(function (dapp) {
							if (installed.indexOf(dapp.transactionId) >= 0) {
								dapps.push(dapp);
							}
						});

						return res.json({success: true, dapps: dapps});
					});
				} else {
					__private.getInstalledIds(function (err, installed) {
						if (err) {
							return res.json({
								success: false,
								error: 'Failed to get installed ids'
							});
						}

						var dapps = [];
						rows.forEach(function (dapp) {
							if (installed.indexOf(dapp.transactionId) < 0) {
								dapps.push(dapp);
							}
						});

						return res.json({success: true, dapps: dapps});
					});
				}
			}).catch(function (err) {
				return res.json({success: false, error: 'Database search failed'});
			});
		});
	});

	router.post('/install', function (req, res, next) {
		req.sanitize(req.body, schema.install, function (err, report, body) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			if (library.config.dapp.masterpassword && body.master !== library.config.dapp.masterpassword) {
				return res.json({success: false, error: 'Invalid master passphrase'});
			}

			__private.get(body.id, function (err, dapp) {
				if (err) {
					library.logger.error(err);
					return res.json({success: false, error: err});
				}

				__private.getInstalledIds(function (err, ids) {
					if (err) {
						library.logger.error(err);
						return res.json({success: false, error: err});
					}

					if (ids.indexOf(body.id) >= 0) {
						return res.json({success: false, error: 'Application is already installed'});
					}

					if (__private.loading[body.id] || __private.uninstalling[body.id]) {
						return res.json({success: false, error: 'Application is loading or being uninstalled'});
					}

					__private.loading[body.id] = true;

					__private.installDApp(dapp, function (err, dappPath) {
						if (err) {
							__private.loading[body.id] = false;
							return res.json({success: false, error: err});
						} else {
							if (dapp.type === 0) {
								__private.installDependencies(dapp, function (err) {
									if (err) {
										library.logger.error(err);
										__private.uninstalling[body.id] = true;
										__private.removeDApp(dapp, function (err) {
											__private.uninstalling[body.id] = false;

											if (err) {
												library.logger.error(err);
											}

											__private.loading[body.id] = false;
											return res.json({
												success: false,
												error: 'Failed to install application dependencies'
											});
										});
									} else {
										library.network.io.sockets.emit('dapps/change', {});

										__private.loading[body.id] = false;
										return res.json({success: true, path: dappPath});
									}
								});
							} else {
								library.network.io.sockets.emit('dapps/change', {});

								__private.loading[body.id] = false;
								return res.json({success: true, path: dappPath});
							}
						}
					});
				});
			});
		});
	});

	router.get('/installed', function (req, res, next) {
		__private.getInstalledIds(function (err, files) {
			if (err) {
				library.logger.error(err);
				return res.json({success: false, error: 'Failed to get installed application ids'});
			}

			if (files.length === 0) {
				return res.json({success: true, dapps: []});
			}

			__private.getByIds(files, function (err, dapps) {
				if (err) {
					library.logger.error(err);
					return res.json({success: false, error: 'Failed to get applications by id'});
				}

				return res.json({success: true, dapps: dapps});
			});
		});
	});

	router.get('/installedIds', function (req, res, next) {
		__private.getInstalledIds(function (err, files) {
			if (err) {
				library.logger.error(err);
				return res.json({success: false, error: 'Failed to get installed application ids'});
			}

			return res.json({success: true, ids: files});
		});
	});

	router.get('/ismasterpasswordenabled', function (req, res, next) {
		return res.json({success: true, enabled: !!library.config.dapp.masterpassword});
	});

	router.post('/uninstall', function (req, res, next) {
		req.sanitize(req.body, schema.uninstall, function (err, report, body) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			if (library.config.dapp.masterpassword && body.master !== library.config.dapp.masterpassword) {
				return res.json({success: false, error: 'Invalid master passphrase'});
			}

			__private.get(body.id, function (err, dapp) {
				if (err) {
					library.logger.error(err);
					return res.json({success: false, error: err});
				}

				if (__private.loading[body.id] || __private.uninstalling[body.id]) {
					return res.json({success: true, error: 'Application is loading or being uninstalled'});
				}

				__private.uninstalling[body.id] = true;

				if (__private.launched[body.id]) {
					// Stop dapp first
					__private.stop(dapp, function (err) {
						if (err) {
							library.logger.error(err);
							return res.json({success: false, error: 'Failed to stop application'});
						} else {
							__private.launched[body.id] = false;
							__private.removeDApp(dapp, function (err) {
								__private.uninstalling[body.id] = false;

								if (err) {
									return res.json({success: false, error: err});
								} else {
									library.network.io.sockets.emit('dapps/change', {});

									return res.json({success: true});
								}
							});
						}
					});
				} else {
					__private.removeDApp(dapp, function (err) {
						__private.uninstalling[body.id] = false;

						if (err) {
							return res.json({success: false, error: err});
						} else {
							library.network.io.sockets.emit('dapps/change', {});

							return res.json({success: true});
						}
					});
				}
			});
		});
	});

	router.post('/launch', function (req, res, next) {
		if (library.config.dapp.masterpassword && req.body.master !== library.config.dapp.masterpassword) {
			return res.json({success: false, error: 'Invalid master passphrase'});
		}

		__private.launch(req.body, function (err) {
			if (err) {
				return res.json({'success': false, 'error': err});
			} else {
				library.network.io.sockets.emit('dapps/change', {});
				return res.json({'success': true});
			}
		});
	});

	router.get('/installing', function (req, res, next) {
		var ids = [];
		for (var i in __private.loading) {
			if (__private.loading[i]) {
				ids.push(i);
			}
		}

		return res.json({success: true, installing: ids});
	});

	router.get('/uninstalling', function (req, res, next) {
		var ids = [];
		for (var i in __private.uninstalling) {
			if (__private.uninstalling[i]) {
				ids.push(i);
			}
		}

		return res.json({success: true, uninstalling: ids});
	});

	router.get('/launched', function (req, res, next) {
		var ids = [];
		for (var i in __private.launched) {
			if (__private.launched[i]) {
				ids.push(i);
			}
		}

		return res.json({success: true, launched: ids});
	});

	router.get('/categories', function (req, res, next) {
		return res.json({success: true, categories: dappCategories});
	});

	router.post('/stop', function (req, res, next) {
		req.sanitize(req.body, schema.stop, function (err, report, body) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			if (!__private.launched[body.id]) {
				return res.json({success: false, error: 'Application not launched'});
			}

			if (library.config.dapp.masterpassword && body.master !== library.config.dapp.masterpassword) {
				return res.json({success: false, error: 'Invalid master passphrase'});
			}

			__private.get(body.id, function (err, dapp) {
				if (err) {
					library.logger.error(err);
					return res.json({success: false, error: 'Application not found'});
				} else {
					__private.stop(dapp, function (err) {
						if (err) {
							library.logger.error(err);
							return res.json({success: false, error: 'Failed to stop application'});
						} else {
							library.network.io.sockets.emit('dapps/change', {});
							__private.launched[body.id] = false;
							return res.json({success: true});
						}
					});
				}
			});
		});
	});

	router.map(__private, {
		'put /transaction': 'addTransactions',
		'put /withdrawal': 'sendWithdrawal'
	});

	library.network.app.use('/api/dapps', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

// Private methods
__private.get = function (id, cb) {
	library.db.query(sql.get, { id: id }).then(function (rows) {
		if (rows.length === 0) {
			return setImmediate(cb, 'Application not found');
		} else {
			return setImmediate(cb, null, rows[0]);
		}
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#get error');
	});
};

__private.getByIds = function (ids, cb) {
	library.db.query(sql.getByIds, [ids]).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#getByIds error');
	});
};

__private.list = function (filter, cb) {
	var params = {}, where = [];

	if (filter.type >= 0) {
		where.push('"type" = ${type}');
		params.type = filter.type;
	}

	if (filter.name) {
		where.push('"name" = ${name}');
		params.name = filter.name;
	}

	if (filter.category) {
		var category = dappCategories[filter.category];

		if (category != null && category !== undefined) {
			where.push('"category" = ${category}');
			params.category = category;
		} else {
			return setImmediate(cb, 'Invalid application category');
		}
	}

	if (filter.link) {
		where.push('"link" = ${link}');
		params.link = filter.link;
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
	}

	var orderBy = OrderBy(
		filter.orderBy, {
			sortFields: sql.sortFields
		}
	);

	if (orderBy.error) {
		return setImmediate(cb, orderBy.error);
	}

	library.db.query(sql.list({
		where: where,
		sortField: orderBy.sortField,
		sortMethod: orderBy.sortMethod
	}), params).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

__private.createBasePathes = function (cb) {
	async.series({
		createImagesDappsPath: function (seriesCb) {
			var imagesPath = path.join(library.public, 'images', 'dapps');

			fs.exists(imagesPath, function (exists) {
				if (exists) {
					return setImmediate(seriesCb);
				} else {
					fs.mkdir(imagesPath, seriesCb);
				}
			});
		},
		createDappsPath: function (seriesCb) {
			fs.exists(__private.dappsPath, function (exists) {
				if (exists) {
					return setImmediate(seriesCb);
				} else {
					fs.mkdir(__private.dappsPath, seriesCb);
				}
			});
		},
		createPublicDappsPath: function (seriesCb) {
			var dappsPublic = path.join(__private.appPath, 'public', 'dapps');

			fs.exists(dappsPublic, function (exists) {
				if (exists) {
					return setImmediate(seriesCb);
				} else {
					fs.mkdir(dappsPublic, seriesCb);
				}
			});
		}
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.installDependencies = function (dapp, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);

	var packageJson = path.join(dappPath, 'package.json');
	var config = null;

	try {
		config = JSON.parse(fs.readFileSync(packageJson));
	} catch (e) {
		return setImmediate(cb, 'Failed to open package.json file');
	}

	npm.load(config, function (err) {
		if (err) {
			return setImmediate(cb, err);
		}

		npm.root = path.join(dappPath, 'node_modules');
		npm.prefix = dappPath;

		npm.commands.install(function (err, data) {
			return setImmediate(cb, null);
		});
	});
};

__private.getInstalledIds = function (cb) {
	fs.readdir(__private.dappsPath, function (err, files) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			var regExp = new RegExp(/[0-9]{18,20}/);

			files = _.filter(files, function (f) {
				return regExp.test(f.toString());
			});

			return setImmediate(cb, null, files);
		}
	});
};

__private.removeDApp = function (dapp, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);

	function remove(err) {
		if (err) {
			library.logger.error('Failed to uninstall application');
		}

		rmdir(dappPath, function (err) {
			if (err) {
				return setImmediate(cb, 'Failed to remove application folder');
			} else {
				return setImmediate(cb);
			}
		});
	}

	fs.exists(dappPath, function (exists) {
		if (!exists) {
			return setImmediate(cb, 'Application not found');
		} else {
			var blockchain;

			try {
				blockchain = require(path.join(dappPath, 'blockchain.json'));
			} catch (e) {
				return remove(e.toString());
			}

			modules.sql.dropTables(dapp.transactionId, blockchain, function (err) {
				if (err) {
					library.logger.error('Failed to drop application tables');
				}
				remove(err);
			});
		}
	});
};

__private.downloadLink = function (dapp, dappPath, cb) {
	var tmpDir = 'tmp';
	var tmpPath = path.join(__private.appPath, tmpDir, dapp.transactionId + '.zip');

	async.series({
		makeDirectory: function (serialCb) {
			fs.exists(tmpDir, function (exists) {
				if (exists) {
					return setImmediate(serialCb, null);
				} else {
					fs.mkdir(tmpDir , function (err) {
						if (err) {
							return setImmediate(serialCb, 'Failed to make tmp directory');
						} else {
							return setImmediate(serialCb, null);
						}
					});
				}
			});
		},
		performDownload: function (serialCb) {
			library.logger.info(dapp.transactionId, 'Downloading: ' + dapp.link);

			function cleanup (err) {
				library.logger.error(dapp.transactionId, 'Download failed: ' + err.message);

				fs.exists(tmpPath, function (exists) {
					if (exists) { fs.unlink(tmpPath); }
					return setImmediate(serialCb, err.message);
				});
			}

			var request = popsicle.get({
				url: dapp.link,
				timeout: 12000,
				transport: popsicle.createTransport({ type: 'stream' })
			});

			request.then(function (res) {
				if (res.status !== 200) {
					return setImmediate(serialCb, ['Received bad response code', res.status].join(' '));
				}

				var stream = fs.createWriteStream(tmpPath);

				stream.on('error', cleanup);

				stream.on('finish', function () {
					library.logger.info(dapp.transactionId, 'Finished downloading');
					stream.close(serialCb);
				});

				res.body.pipe(stream);
			});

			request.catch(cleanup);
		},
		decompressZip: function (serialCb) {
			var unzipper = new DecompressZip(tmpPath);

			library.logger.info(dapp.transactionId, 'Decompressing zip file');

			unzipper.on('error', function (err) {
				library.logger.error(dapp.transactionId, 'Decompression failed: ' + err.message);
				fs.exists(tmpPath, function (exists) {
					if (exists) { fs.unlink(tmpPath); }
					return setImmediate(serialCb, 'Failed to decompress zip file');
				});
			});

			unzipper.on('extract', function (log) {
				library.logger.info(dapp.transactionId, 'Finished extracting');
				fs.exists(tmpPath, function (exists) {
					if (exists) { fs.unlink(tmpPath); }
					return setImmediate(serialCb, null);
				});
			});

			unzipper.on('progress', function (fileIndex, fileCount) {
				library.logger.info(dapp.transactionId, ['Extracted file', (fileIndex + 1), 'of', fileCount].join(' '));
			});

			unzipper.extract({
				path: dappPath,
				strip: 1
			});
		}
	},
	function (err) {
		return setImmediate(cb, err);
	});
};

__private.installDApp = function (dapp, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);

	async.series({
		checkInstalled: function (serialCb) {
			fs.exists(dappPath, function (exists) {
				if (exists) {
					return setImmediate(serialCb, 'Application is already installed');
				} else {
					return setImmediate(serialCb, null);
				}
			});
		},
		makeDirectory: function (serialCb) {
			fs.mkdir(dappPath, function (err) {
				if (err) {
					return setImmediate(serialCb, 'Failed to make application directory');
				} else {
					return setImmediate(serialCb, null);
				}
			});
		},
		performInstall: function (serialCb) {
			return __private.downloadLink(dapp, dappPath, serialCb);
		}
	},
	function (err) {
		if (err) {
			return setImmediate(cb, dapp.transactionId + ' Installation failed: ' + err);
		} else {
			return setImmediate(cb, null, dappPath);
		}
	});
};

__private.symlink = function (dapp, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);
	var dappPublicPath = path.join(dappPath, 'public');
	var dappPublicLink = path.join(__private.appPath, 'public', 'dapps', dapp.transactionId);

	fs.exists(dappPublicPath, function (exists) {
		if (exists) {
			fs.exists(dappPublicLink, function (exists) {
				if (exists) {
					return setImmediate(cb);
				} else {
					fs.symlink(dappPublicPath, dappPublicLink, cb);
				}
			});
		} else {
			return setImmediate(cb);
		}
	});
};

__private.apiHandler = function (message, callback) {
	// Get all modules
	try {
		var strs = message.call.split('#');
		var module = strs[0], call = strs[1];

		if (!modules[module]) {
			return setImmediate(callback, 'Invalid module in call: ' + message.call);
		}

		if (!modules[module].sandboxApi) {
			return setImmediate(callback, 'Module does not have sandbox api');
		}

		modules[module].sandboxApi(call, {'body': message.args, 'dappid': message.dappid}, callback);
	} catch (e) {
		return setImmediate(callback, 'Invalid call ' + e.toString());
	}
};

__private.dappRoutes = function (dapp, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);
	var dappRoutesPath = path.join(dappPath, 'routes.json');

	fs.exists(dappRoutesPath, function (exists) {
		if (exists) {
			var routes;

			try {
				routes = require(dappRoutesPath);
			} catch (e) {
				return setImmediate(cb, 'Failed to open routes.json file');
			}

			__private.routes[dapp.transactionId] = new Router();

			routes.forEach(function (router) {
				if (router.method === 'get' || router.method === 'post' || router.method === 'put') {
					__private.routes[dapp.transactionId][router.method](router.path, function (req, res) {

						self.request(dapp.transactionId, router.method, router.path, (router.method === 'get') ? req.query : req.body, function (err, body) {
							if (!err && body.error) {
								err = body.error;
							}
							if (err) {
								body = {error: err};
							}
							body.success = !err;
							res.json(body);
						});
					});
				}
			});

			library.network.app.use('/api/dapps/' + dapp.transactionId + '/api/', __private.routes[dapp.transactionId]);
			library.network.app.use(function (err, req, res, next) {
				if (!err) { return next(); }
				library.logger.error(req.url, err);
				res.status(500).send({success: false, error: err});
			});

			return setImmediate(cb);
		} else {
			return setImmediate(cb);
		}
	});
};

__private.launch = function (body, cb) {
	async.waterfall([
		function (waterCb) {
			library.scheme.validate(body, schema.launch, function (err) {
				if (err) {
					return setImmediate(waterCb, err[0].message);
				} else {
					return setImmediate(waterCb);
				}
			});
		},
		function (waterCb) {
			if (__private.launched[body.id]) {
				return setImmediate(waterCb, 'Application already launched');
			} else {
				body.params = body.params || [''];

				if (body.params.length > 0) {
					body.params.push('modules.full.json');
				}

				__private.launched[body.id] = true;

				return setImmediate(waterCb);
			}
		},
		function (waterCb) {
			__private.get(body.id, function (err, dapp) {
				if (err) {
					__private.launched[body.id] = false;
					return setImmediate(waterCb, 'Application not found');
				} else {
					return setImmediate(waterCb, null, dapp);
				}
			});
		},
		function (dapp, waterCb) {
			__private.getInstalledIds(function (err, ids) {
				if (err) {
					__private.launched[body.id] = false;
					return setImmediate(waterCb, 'Failed to get installed applications');
				} else if (ids.indexOf(body.id) < 0) {
					__private.launched[body.id] = false;
					return setImmediate(waterCb, 'Application not installed');
				} else {
					return setImmediate(waterCb, null, dapp);
				}
			});
		},
		function (dapp, waterCb) {
			__private.symlink(dapp, function (err) {
				if (err) {
					__private.launched[body.id] = false;
					return setImmediate(waterCb, 'Failed to create public link');
				} else {
					return setImmediate(waterCb, null, dapp);
				}
			});
		},
		function (dapp, waterCb) {
			__private.run(dapp, body.params || ['', 'modules.full.json'], function (err) {
				if (err) {
					__private.launched[body.id] = false;
					return setImmediate(waterCb, err);
				} else {
					return setImmediate(waterCb, null, dapp);
				}
			});
		},
		function (dapp, waterCb) {
			__private.dappRoutes(dapp, function (err) {
				if (err) {
					__private.launched[body.id] = false;
					__private.stop(dapp, function (err) {
						if (err) {
							return setImmediate(waterCb, 'Failed to stop application');
						} else {
							return setImmediate(waterCb, 'Failed to create application routes');
						}
					});
				} else {
					return setImmediate(waterCb, null, dapp);
				}
			});
		}
	], function (err, dapp) {
		if (err) {
			library.logger.error('Failed to launch application', err);
		} else {
			library.logger.info('Application launched successfully');
		}
		return setImmediate(cb, err);
	});
};

__private.run = function (dapp, params, cb) {
	var dappPath = path.join(__private.dappsPath, dapp.transactionId);
	var dappPublicPath = path.join(dappPath, 'public');
	var dappPublicLink = path.join(__private.appPath, 'public', 'dapps', dapp.transactionId);

	var dappConfig;

	try {
		dappConfig = require(path.join(dappPath, 'config.json'));
	} catch (e) {
		return setImmediate(cb, 'Failed to open config.json file');
	}

	async.eachSeries(dappConfig.peers, function (peer, eachSeriesCb) {
		modules.peers.addDapp({
			ip: peer.ip,
			port: peer.port,
			dappid: dapp.transactionId
		}, eachSeriesCb);
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		}

		var blockchain;

		try {
			blockchain = require(path.join(dappPath, 'blockchain.json'));
		} catch (e) {
			return setImmediate(cb, 'Failed to open blockchain.json file');
		}

		modules.sql.createTables(dapp.transactionId, blockchain, function (err) {
			if (err) {
				return setImmediate(cb, err);
			}

			var sandbox = new Sandbox(path.join(dappPath, 'index.js'), dapp.transactionId, params, __private.apiHandler, true);
			__private.sandboxes[dapp.transactionId] = sandbox;

			sandbox.on('exit', function () {
				__private.stop(dapp, function (err) {
					if (err) {
						library.logger.error('Failed to stop application', dapp.transactionId);
					} else {
						library.logger.info(['Application', dapp.transactionId, 'closed'].join(' '));
					}
				});
			});

			sandbox.on('error', function (err) {
				library.logger.error(['Encountered error in application', dapp.transactionId].join(' '), err);
				__private.stop(dapp, function (err) {
					if (err) {
						library.logger.error('Failed to stop application', dapp.transactionId);
					} else {
						library.logger.info(['Application', dapp.transactionId, 'closed'].join(' '));
					}
				});
			});

			sandbox.run();

			return setImmediate(cb);
		});
	});
};

__private.stop = function (dapp, cb) {
	var dappPublicLink = path.join(__private.appPath, 'public', 'dapps', dapp.transactionId);

	async.series({
		checkInstalled: function (seriesCb) {
			fs.exists(dappPublicLink, function (exists) {
				if (exists) {
					return setImmediate(seriesCb);
				} else {
					return setImmediate(seriesCb, 'Application not found');
				}
			});
		},
		deleteSandbox: function (seriesCb) {
			if (__private.sandboxes[dapp.transactionId]) {
				__private.sandboxes[dapp.transactionId].exit();
			}

			delete __private.sandboxes[dapp.transactionId];
			return setImmediate(seriesCb);
		},
		deleteRoutes: function (seriesCb) {
			delete __private.routes[dapp.transactionId];
			return setImmediate(seriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.addTransactions = function (req, cb) {
	library.scheme.validate(req.body, schema.addTransactions, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);

		if (req.body.publicKey) {
			if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
				return setImmediate(cb, 'Invalid passphrase');
			}
		}

		var query = {};

		library.balancesSequence.add(function (cb) {
			if (req.body.multisigAccountPublicKey && req.body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: req.body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Multisignature account not found');
					}

					if (!account.multisignatures || !account.multisignatures) {
						return setImmediate(cb, 'Account does not have multisignatures enabled');
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return setImmediate(cb, 'Account does not belong to multisignature group');
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return setImmediate(cb, err);
						}

						if (!requester || !requester.publicKey) {
							return setImmediate(cb, 'Requester not found');
						}

						if (requester.secondSignature && !req.body.secondSecret) {
							return setImmediate(cb, 'Missing requester second passphrase');
						}

						if (requester.publicKey === account.publicKey) {
							return setImmediate(cb, 'Invalid requester public key');
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
							secondKeypair = library.ed.makeKeypair(secondHash);
						}

						var transaction;

						try {
							transaction = library.logic.transaction.create({
								type: transactionTypes.IN_TRANSFER,
								amount: req.body.amount,
								sender: account,
								keypair: keypair,
								requester: keypair,
								secondKeypair: secondKeypair,
								dappId: req.body.dappId
							});
						} catch (e) {
							return setImmediate(cb, e.toString());
						}

						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Account not found');
					}

					if (account.secondSignature && !req.body.secondSecret) {
						return setImmediate(cb, 'Invalid second passphrase');
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
						secondKeypair = library.ed.makeKeypair(secondHash);
					}

					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.IN_TRANSFER,
							amount: req.body.amount,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair,
							dappId: req.body.dappId
						});
					} catch (e) {
						return setImmediate(cb, e.toString());
					}

					modules.transactions.receiveTransactions([transaction], cb);
				});
			}
		}, function (err, transaction) {
			if (err) {
				return setImmediate(cb, err);
			}

			return setImmediate(cb, null, {transactionId: transaction[0].id});
		});
	});
};

__private.sendWithdrawal = function (req, cb) {
	library.scheme.validate(req.body, schema.sendWithdrawal, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);
		var query = {};

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!isAddress.test(req.body.recipientId)) {
			return setImmediate(cb, 'Invalid recipient');
		}

		library.balancesSequence.add(function (cb) {
			if (req.body.multisigAccountPublicKey && req.body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: req.body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Multisignature account not found');
					}

					if (!account.multisignatures || !account.multisignatures) {
						return setImmediate(cb, 'Account does not have multisignatures enabled');
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return setImmediate(cb, 'Account does not belong to multisignature group');
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return setImmediate(cb, err);
						}

						if (!requester || !requester.publicKey) {
							return setImmediate(cb, 'Requester not found');
						}

						if (requester.secondSignature && !req.body.secondSecret) {
							return setImmediate(cb, 'Missing requester second passphrase');
						}

						if (requester.publicKey === account.publicKey) {
							return setImmediate(cb, 'Invalid requester public key');
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
							secondKeypair = library.ed.makeKeypair(secondHash);
						}

						var transaction;

						try {
							transaction = library.logic.transaction.create({
								type: transactionTypes.OUT_TRANSFER,
								amount: req.body.amount,
								sender: account,
								recipientId: req.body.recipientId,
								keypair: keypair,
								secondKeypair: secondKeypair,
								requester: keypair,
								dappId: req.body.dappId,
								transactionId: req.body.transactionId
							});
						} catch (e) {
							return setImmediate(cb, e.toString());
						}

						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Account not found');
					}

					if (account.secondSignature && !req.body.secondSecret) {
						return setImmediate(cb, 'Missing second passphrase');
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
						secondKeypair = library.ed.makeKeypair(secondHash);
					}

					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.OUT_TRANSFER,
							amount: req.body.amount,
							sender: account,
							recipientId: req.body.recipientId,
							keypair: keypair,
							secondKeypair: secondKeypair,
							dappId: req.body.dappId,
							transactionId: req.body.transactionId
						});
					} catch (e) {
						return setImmediate(cb, e.toString());
					}

					modules.transactions.receiveTransactions([transaction], cb);
				});
			}
		}, function (err, transaction) {
			if (err) {
				return setImmediate(cb, err);
			}

			return setImmediate(cb, null, {transactionId: transaction[0].id});
		});
	});
};

// Public methods
DApps.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

DApps.prototype.message = function (dappid, body, cb) {
	self.request(dappid, 'post', '/message', body, cb);
};

DApps.prototype.request = function (dappid, method, path, query, cb) {
	if (!__private.sandboxes[dappid]) {
		return setImmediate(cb, 'Application sandbox not found');
	}
	if (!__private.dappready[dappid]) {
		return setImmediate(cb, 'Application not ready');
	}
	__private.sandboxes[dappid].sendMessage({
		method: method,
		path: path,
		query: query
	}, cb);
};

// Events
DApps.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.DAPP].bind({
		library: library
	});

	__private.assetTypes[transactionTypes.IN_TRANSFER].bind({
		modules: modules, library: library, shared: shared
	});

	__private.assetTypes[transactionTypes.OUT_TRANSFER].bind({
		modules: modules, library: library
	});
};

DApps.prototype.onBlockchainReady = function () {
	setTimeout(function () {
		if (!library.config.dapp) { return; }

		async.eachSeries(library.config.dapp.autoexec || [], function (dapp, cb) {
			__private.launch({
				params: dapp.params,
				id: dapp.dappid,
				master: library.config.dapp.masterpassword
			}, function (err) {
				if (err) {
					library.logger.error('Failed to launch application', err);
				} else {
					library.logger.info('Application launched successfully');
				}

				return setImmediate(cb);
			});
		});
	}, 1000);
};

DApps.prototype.onDeleteBlocksBefore = function (block) {
	Object.keys(__private.sandboxes).forEach(function (dappId) {
		self.request(dappId, 'post', '/message', {
			topic: 'rollback',
			message: {pointId: block.id, pointHeight: block.height}
		}, function (err) {
			if (err) {
				library.logger.error('DApps#onDeleteBlocksBefore error', err);
			}
		});
	});
};

DApps.prototype.onNewBlock = function (block, broadcast) {
	Object.keys(__private.sandboxes).forEach(function (dappId) {
		if (broadcast) {
			self.request(dappId, 'post', '/message', {
				topic: 'point',
				message: {id: block.id, height: block.height}
			}, function (err) {
				if (err) {
					library.logger.error('DApps#onNewBlock error:', err);
				}
			});
		}
	});
};

// Shared
shared.getGenesis = function (req, cb) {
	library.db.query(sql.getGenesis, { id: req.dappid }).then(function (rows) {
		if (rows.length === 0) {
			return setImmediate(cb, 'Application genesis block not found');
		} else {
			var row = rows[0];

			return setImmediate(cb, null, {
				pointId: row.id,
				pointHeight: row.height,
				authorId: row.authorId,
				dappid: req.dappid
			});
		}
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#getGenesis error');
	});
};

shared.setReady = function (req, cb) {
	__private.dappready[req.dappid] = true;
	return setImmediate(cb, null, {});
};

shared.getCommonBlock = function (req, cb) {
	library.db.query(sql.getCommonBlock, {
		dappid: req.dappid,
		type: transactionTypes.IN_TRANSFER
	}).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#getCommonBlock error');
	});
};

shared.sendWithdrawal = function (req, cb) {
	return __private.sendWithdrawal(req, cb);
};

shared.getWithdrawalLastTransaction = function (req, cb) {
	library.db.query(sql.getWithdrawalLastTransaction, {
		dappid: req.dappid,
		type: transactionTypes.OUT_TRANSFER
	}).then(function (rows) {
		return setImmediate(cb, null, rows[0]);
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#getWithdrawalLastTransaction error');
	});
};

shared.getBalanceTransactions = function (req, cb) {
	library.db.query(sql.getBalanceTransactions({
		lastId: req.body.lastTransactionId
	}), {
		dappid: req.dappid,
		type: transactionTypes.IN_TRANSFER,
		lastId: req.body.lastTransactionId
	}).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		return setImmediate(cb, 'DApp#getBalanceTransaction error');
	});
};

// Export
module.exports = DApps;
