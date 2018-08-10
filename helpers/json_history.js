'use strict';

const assert = require('assert');
const semver = require('semver');
const async = require('async');

function JSONHistory(title, logger) {
	const self = this;

	// Title of the json history object
	self.title = title;
	self.logger = logger || console;

	// List of versions available
	const versions = [];

	// List of changes for particular version
	const changes = [];

	function VersionObject(version) {
		this.version = version;

		this.change = (title, change) => {
			assert(title, 'Title for the change is required.');
			assert(
				typeof change === 'function',
				'Callback for the change is required.'
			);
			assert(
				change.length > 0 && change.length < 3,
				'Callback for the change accepts up-to two arguments.'
			);

			changes.push({
				version: this.version,
				title,
				change,
			});
		};
	}

	this.version = (version, changes) => {
		assert(version, 'Invalid version specified.');
		assert(
			semver.valid(version) || semver.validRange(version),
			'Invalid version or version range specified.'
		);
		assert(!versions.includes(version), `Version ${version} already declared.`);

		versions.push(version);

		if (changes) {
			changes.call(self, new VersionObject(version));
		}
	};

	const applyChange = (change, data, cb) => {
		if (change.change.length === 0) {
			throw new TypeError('There must be one param defined for the change');
		}

		// Copy the data to avoid changing source
		data = Object.assign({}, data);

		self.logger.info(`--- ${change.title}`);

		// Its a sync function
		if (change.change.length === 1) {
			return setImmediate(cb, null, change.change(data));
		}

		// It was an async change
		change.change(data, (error, updatedData) =>
			setImmediate(cb, error, updatedData)
		);
	};

	const applyChangesOfVersion = (versionIndex, data, cb) => {
		const changeSet = changes.filter(c => c.version === versions[versionIndex]);

		// Copy the data to avoid changing source
		data = Object.assign({}, data);

		if (changeSet.length === 0) {
			self.logger.info(
				`\n\n- No changes for version "${versions[versionIndex]}"`
			);
		} else {
			self.logger.info(
				`\n\n- Applying changes for version "${versions[versionIndex]}"`
			);
		}

		async.eachSeries(
			changeSet,
			(change, eachCallback) => {
				applyChange(change, data, (err, updatedData) => {
					data = updatedData;
					return setImmediate(eachCallback, err, data);
				});
			},
			err => setImmediate(cb, err, data)
		);
	};

	this.migrate = (json, fromVersion, toVersion, cb) => {
		let includeStart = false;

		if (toVersion === undefined && cb === undefined) {
			cb = fromVersion;
			includeStart = true;
			fromVersion = versions[0];
			toVersion = versions[versions.length - 1];
		}

		if (cb === undefined) {
			cb = toVersion;
			toVersion = versions[versions.length - 1];
		}

		assert(typeof json === 'object', 'Invalid json object to migrate.');
		if (fromVersion)
			assert(
				semver.valid(fromVersion),
				'Invalid start version specified to migrate.'
			);
		if (toVersion)
			assert(
				semver.valid(toVersion),
				'Invalid end version specified to migrate.'
			);
		assert(typeof cb === 'function', 'Invalid callback specified to migrate.');

		self.logger.info(
			`Applying migration of ${self.title} from ${fromVersion} to ${toVersion}`
		);

		// Get the version from which to start the migration
		// Skip the matched version, as json is already in that particular version
		let startFromVersion = versions.findIndex(version =>
			semver.satisfies(fromVersion, version)
		);

		if (startFromVersion === -1) {
			throw new Error(
				`Can't find supported version to start migration from  version "${fromVersion}"`
			);
		}

		startFromVersion += includeStart ? 0 : 1;

		// Apply changes till that version
		const tillVersion =
			versions.findIndex(version => semver.satisfies(toVersion, version)) ||
			versions.length - 1;

		// Clone the provided json to avoid changes into source
		let compiledJson = Object.assign({}, json);

		let currentVersionIndex = startFromVersion;

		async.whilst(
			() => currentVersionIndex <= tillVersion,
			whileCb => {
				applyChangesOfVersion(
					currentVersionIndex,
					compiledJson,
					(err, data) => {
						compiledJson = data;
						currentVersionIndex += 1;
						return setImmediate(whileCb, err, data);
					}
				);
			},
			err => setImmediate(cb, err, compiledJson)
		);
	};

	this.getVersions = () => versions;
	this.getChangeSet = () => changes;

	return self;
}

module.exports = JSONHistory;
