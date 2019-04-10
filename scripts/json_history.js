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

		// eslint-disable-next-line no-shadow
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

	this.version = (version, versionChanges) => {
		assert(version, 'Invalid version specified.');
		assert(
			semver.valid(version) || semver.validRange(version),
			'Invalid version or version range specified.'
		);
		assert(!versions.includes(version), `Version ${version} already declared.`);

		versions.push(version);

		if (versionChanges) {
			versionChanges.call(self, new VersionObject(version));
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
		return change.change(data, (error, updatedData) =>
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

	/**
	 * Migrate the json object provided
	 *
	 * @param {Object} json - JSON object to apply migrations
	 * @param {string} [jsonVersion] - Start version
	 * @param {string} [migrateToVersion] - End version
	 * @param {Function} cb
	 * @returns {setImmediateCallback} cb, null, self
	 */
	this.migrate = (json, jsonVersion, migrateToVersion, cb) => {
		let startIndex;
		let tillIndex;

		if (migrateToVersion === undefined && cb === undefined) {
			cb = jsonVersion;

			// As start version not specified so start from 0
			startIndex = 0;
			tillIndex = versions.length - 1;

			jsonVersion = versions[startIndex];
			migrateToVersion = versions[tillIndex];
		}

		if (cb === undefined) {
			cb = migrateToVersion;

			// As end not provided so migrate till last version
			tillIndex = versions.length - 1;
			migrateToVersion = versions[tillIndex];
		}

		assert(typeof json === 'object', 'Invalid json object to migrate.');
		if (jsonVersion) {
			assert(
				semver.valid(jsonVersion),
				'Invalid start version specified to migrate.'
			);
		}
		if (migrateToVersion) {
			assert(
				semver.valid(migrateToVersion),
				'Invalid end version specified to migrate.'
			);
		}
		assert(typeof cb === 'function', 'Invalid callback specified to migrate.');

		self.logger.info(
			`Applying migration of ${
				self.title
			} from ${jsonVersion} to ${migrateToVersion}`
		);

		// Get the version from which to start the migration
		// Skip the matched version, as json is already in that particular version
		// Used ltr to to match the range versions e.g. 1.1.x
		if (startIndex === undefined) {
			startIndex = versions.findIndex(version =>
				semver.ltr(jsonVersion, version)
			);
		}

		if (startIndex < 0) {
			self.logger.info(
				`No migration found applicable from version "${jsonVersion}"`
			);
			return setImmediate(cb, null, json);
		}

		// Apply changes till that version
		// Used ltr to to match the range versions e.g. 1.1.x
		if (tillIndex === undefined) {
			tillIndex =
				versions.findIndex(version => semver.ltr(migrateToVersion, version)) -
				1;
		}

		// If no matching version found then migrate till last version in the list
		if (tillIndex < -1) {
			tillIndex = versions.length - 1;
		}

		// Clone the provided json to avoid changes into source
		let compiledJson = Object.assign({}, json);

		let currentVersionIndex = startIndex;

		return async.whilst(
			() => currentVersionIndex <= tillIndex,
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
