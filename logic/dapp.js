'use strict';

var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var dappCategories = require('../helpers/dappCategories.js');
var sql = require('../sql/dapps.js');
var valid_url = require('valid-url');

// Private fields
var library, __private = {};

__private.unconfirmedNames = {};
__private.unconfirmedLinks = {};
__private.unconfirmedAscii = {};

// Constructor
function DApp () {}

// Public methods
DApp.prototype.bind = function (scope) {
	library = scope.library;
};

DApp.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = 0;

	trs.asset.dapp = {
		category: data.category,
		name: data.name,
		description: data.description,
		tags: data.tags,
		type: data.dapp_type,
		link: data.link,
		icon: data.icon
	};

	return trs;
};

DApp.prototype.calculateFee = function (trs, sender) {
	return constants.fees.dapp;
};

DApp.prototype.verify = function (trs, sender, cb) {
	var i;

	if (trs.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (trs.amount !== 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!trs.asset || !trs.asset.dapp) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (trs.asset.dapp.category !== 0 && !trs.asset.dapp.category) {
		return setImmediate(cb, 'Invalid application category');
	}

	var foundCategory = false;
	for (i in dappCategories) {
		if (dappCategories[i] === trs.asset.dapp.category) {
			foundCategory = true;
			break;
		}
	}

	if (!foundCategory) {
		return setImmediate(cb, 'Application category not found');
	}

	if (trs.asset.dapp.icon) {
		if (!valid_url.isUri(trs.asset.dapp.icon)) {
			return setImmediate(cb, 'Invalid application icon link');
		}

		var length = trs.asset.dapp.icon.length;

		if (
			trs.asset.dapp.icon.indexOf('.png') !== length - 4 &&
			trs.asset.dapp.icon.indexOf('.jpg') !== length - 4 &&
			trs.asset.dapp.icon.indexOf('.jpeg') !== length - 5
		) {
			return setImmediate(cb, 'Invalid application icon file type');
		}
	}

	if (trs.asset.dapp.type > 1 || trs.asset.dapp.type < 0) {
		return setImmediate(cb, 'Invalid application type');
	}

	if (!valid_url.isUri(trs.asset.dapp.link)) {
		return setImmediate(cb, 'Invalid application link');
	}

	if (trs.asset.dapp.link.indexOf('.zip') !== trs.asset.dapp.link.length - 4) {
		return setImmediate(cb, 'Invalid application file type');
	}

	if (!trs.asset.dapp.name || trs.asset.dapp.name.trim().length === 0 || trs.asset.dapp.name.trim() !== trs.asset.dapp.name) {
		return setImmediate(cb, 'Application name must not be blank');
	}

	if (trs.asset.dapp.name.length > 32) {
		return setImmediate(cb, 'Application name is too long. Maximum is 32 characters');
	}

	if (trs.asset.dapp.description && trs.asset.dapp.description.length > 160) {
		return setImmediate(cb, 'Application description is too long. Maximum is 160 characters');
	}

	if (trs.asset.dapp.tags && trs.asset.dapp.tags.length > 160) {
		return setImmediate(cb, 'Application tags is too long. Maximum is 160 characters');
	}

	if (trs.asset.dapp.tags) {
		var tags = trs.asset.dapp.tags.split(',');

		tags = tags.map(function (tag) {
			return tag.trim();
		}).sort();

		for (i = 0; i < tags.length - 1; i++) {
			if (tags[i + 1] === tags[i]) {
				return setImmediate(cb, 'Encountered duplicate tag: ' + tags[i] + ' in application');
			}
		}
	}

	library.db.query(sql.getExisting, {
		name: trs.asset.dapp.name,
		link: trs.asset.dapp.link || null,
		transactionId: trs.id
	}).then(function (rows) {
		var dapp = rows[0];

		if (dapp) {
			if (dapp.name === trs.asset.dapp.name) {
				return setImmediate(cb, 'Application name already exists: ' + dapp.name);
			} else if (dapp.link === trs.asset.dapp.link) {
				return setImmediate(cb, 'Application link already exists: ' + dapp.link);
			} else {
				return setImmediate(cb, 'Application already exists');
			}
		} else {
			return setImmediate(cb, null, trs);
		}
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'DApp#verify error');
	});
};

DApp.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

DApp.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = new Buffer([]);
		var nameBuf = new Buffer(trs.asset.dapp.name, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);

		if (trs.asset.dapp.description) {
			var descriptionBuf = new Buffer(trs.asset.dapp.description, 'utf8');
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (trs.asset.dapp.tags) {
			var tagsBuf = new Buffer(trs.asset.dapp.tags, 'utf8');
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (trs.asset.dapp.link) {
			buf = Buffer.concat([buf, new Buffer(trs.asset.dapp.link, 'utf8')]);
		}

		if (trs.asset.dapp.icon) {
			buf = Buffer.concat([buf, new Buffer(trs.asset.dapp.icon, 'utf8')]);
		}

		var bb = new ByteBuffer(4 + 4, true);
		bb.writeInt(trs.asset.dapp.type);
		bb.writeInt(trs.asset.dapp.category);
		bb.flip();

		buf = Buffer.concat([buf, bb.toBuffer()]);
	} catch (e) {
		throw e;
	}

	return buf;
};

DApp.prototype.apply = function (trs, block, sender, cb) {
	return setImmediate(cb);
};

DApp.prototype.undo = function (trs, block, sender, cb) {
	return setImmediate(cb);
};

DApp.prototype.applyUnconfirmed = function (trs, sender, cb) {
	if (__private.unconfirmedNames[trs.asset.dapp.name]) {
		return setImmediate(cb, 'Application name already exists');
	}

	if (trs.asset.dapp.link && __private.unconfirmedLinks[trs.asset.dapp.link]) {
		return setImmediate(cb, 'Application link already exists');
	}

	__private.unconfirmedNames[trs.asset.dapp.name] = true;
	__private.unconfirmedLinks[trs.asset.dapp.link] = true;

	return setImmediate(cb);
};

DApp.prototype.undoUnconfirmed = function (trs, sender, cb) {
	delete __private.unconfirmedNames[trs.asset.dapp.name];
	delete __private.unconfirmedLinks[trs.asset.dapp.link];

	return setImmediate(cb);
};

DApp.prototype.schema = {
	id: 'DApp',
	type: 'object',
	properties: {
		category: {
			type: 'integer',
			minimum: 0,
			maximum: 8
		},
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 32
		},
		description: {
			type: 'string',
			minLength: 0,
			maxLength: 160
		},
		tags: {
			type: 'string',
			minLength: 0,
			maxLength: 160
		},
		type: {
			type: 'integer',
			minimum: 0
		},
		link: {
			type: 'string',
			minLength: 0,
			maxLength: 2000
		},
		icon: {
			type: 'string',
			minLength: 0,
			maxLength: 2000
		}
	},
	required: ['type', 'name', 'category']
};

DApp.prototype.objectNormalize = function (trs) {
	for (var i in trs.asset.dapp) {
		if (trs.asset.dapp[i] === null || typeof trs.asset.dapp[i] === 'undefined') {
			delete trs.asset.dapp[i];
		}
	}

	var report = library.schema.validate(trs.asset.dapp, DApp.prototype.schema);

	if (!report) {
		throw 'Failed to validate dapp schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

DApp.prototype.dbRead = function (raw) {
	if (!raw.dapp_name) {
		return null;
	} else {
		var dapp = {
			name: raw.dapp_name,
			description: raw.dapp_description,
			tags: raw.dapp_tags,
			type: raw.dapp_type,
			link: raw.dapp_link,
			category: raw.dapp_category,
			icon: raw.dapp_icon
		};

		return {dapp: dapp};
	}
};

DApp.prototype.dbTable = 'dapps';

DApp.prototype.dbFields = [
	'type',
	'name',
	'description',
	'tags',
	'link',
	'category',
	'icon',
	'transactionId'
];

DApp.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			type: trs.asset.dapp.type,
			name: trs.asset.dapp.name,
			description: trs.asset.dapp.description || null,
			tags: trs.asset.dapp.tags || null,
			link: trs.asset.dapp.link || null,
			icon: trs.asset.dapp.icon || null,
			category: trs.asset.dapp.category,
			transactionId: trs.id
		}
	};
};

DApp.prototype.afterSave = function (trs, cb) {
	if (library) {
		library.network.io.sockets.emit('dapps/change', {});
	}
	return setImmediate(cb);
};

DApp.prototype.ready = function (trs, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(trs.signatures)) {
			return false;
		}
		return trs.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = DApp;
