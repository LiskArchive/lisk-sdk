'use strict';

var chai   = require('chai');
var crypto = require('crypto');
var expect = require('chai').expect;

var modulesLoader = require('../../common/initModule').modulesLoader;
var slots         = require('../../../helpers/slots.js');
var sql           = require('../../sql/delegatesList.js');

function generateDelegatesList (round, delegates) {
	var i, x, n, old, len;
	var list = [];
	var hash = crypto.createHash('sha256').update(round, 'utf8').digest();

	// Copy delegates array
	i = delegates.length;
	while (i--) {
		list[i] = delegates[i];
	}

	// Generate new delegates list
	for (i = 0, len = list.length; i < len; i++) {
		for (x = 0; x < 4 && i < len; i++, x++) {
			n = hash[x] % len;
			old = list[n];
			list[n] = list[i];
			list[i] = old;
		}
		hash = crypto.createHash('sha256').update(hash).digest();
	}

	return list;
};

describe('Delegate list SQL functions', function () {
	var db;

	before(function (done) {
		modulesLoader.getDbConnection(function (err, db_handle) {
			if (err) {
				return done(err);
			}
			db = db_handle;
			done();
		});
	});

	// Old logic - not used, for reference only
	function getKeysSortByVote (cb) {
		library.db.query(sql.delegateList).then(function (rows) {
			return setImmediate(cb, null, rows.map(function (el) {
				return el.pk;
			}));
		}).catch(function (err) {
			return setImmediate(cb, err);
		});
	};

	// Old logic - not used, for reference only
	function generateDelegateList (height, cb) {
		getKeysSortByVote(function (err, truncDelegateList) {
			if (err) {
				return setImmediate(cb, err);
			}

			var seedSource = slots.calcRound(height).toString();
			var currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();

			for (var i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
				for (var x = 0; x < 4 && i < delCount; i++, x++) {
					var newIndex = currentSeed[x] % delCount;
					var b = truncDelegateList[newIndex];
					truncDelegateList[newIndex] = truncDelegateList[i];
					truncDelegateList[i] = b;
				}
				currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
			}

			return setImmediate(cb, null, truncDelegateList);
		});
	}

	describe('generateDelegatesList()', function () {

		describe('results', function () {

			it('SQL results should be equal to native - fake 101 delegates', function (done) {
				var round = '26381';
				var delegates = [];
				for (var i = 1; i <= 101; i++) {
					delegates.push(i.toString());
				}
				var expectedDelegates = generateDelegatesList(round, delegates);

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					expect(rows).to.be.an('array').and.lengthOf(1);
					expect(rows[0]).to.be.an('object');
					expect(rows[0].delegates).to.be.an('array').and.lengthOf(delegates.length);
					for (var i = rows[0].delegates.length - 1; i >= 0; i--) {
						expect(rows[0].delegates[i]).to.equal(expectedDelegates[i]);
					}
					done();
				}).catch(done);
			});

			it('SQL results should be equal to native - real 101 delegates, exact order', function (done) {
				var round = '26381';
				var delegates = [
					'ec111c8ad482445cfe83d811a7edd1f1d2765079c99d7d958cca1354740b7614',
					'b002f58531c074c7190714523eec08c48db8c7cfc0c943097db1a2e82ed87f84',
					'1a99630b0ca1642b232888a3119e68b000b6194eced51e7fe3231bbe476f7c10',
					'677c79b243ed96a8439e8bd193d6ab966ce43c9aa18830d2b9eb8974455d79f8',
					'25e961fa459d202816776c8736560d493a94fdd7381971f63fb9b70479487598',
					'32f20bee855238630b0f791560c02cf93014977b4b25c19ef93cd92220390276',
					'00de7d28ec3f55f42329667f08352d0d90faa3d2d4e62c883d86d1d7b083dd7c',
					'ad936990fb57f7e686763c293e9ca773d1d921888f5235189945a10029cd95b0',
					'253e674789632f72c98d47a650f1ca5ece0dbb82f591080471129d57ed88fb8a',
					'd12a6aef4b165b0197adb82d0d544202897b95300ff1fff93c339cf866defb0d',
					'76ceefed8f29dd48664b07d207f4bf202122f2ffed6dcefa802d7fe348203b88',
					'326bff18531703385d4037e5585b001e732c4a68afb8f82efe2b46c27dcf05aa',
					'2493d52fc34ecaaa4a7d0d76e6de9bda24f1b5e11e3363c30a13d59e9c345f82',
					'c4d96fbfe80102f01579945fe0c5fe2a1874a7ffeca6bacef39140f9358e3db6',
					'393f73238941510379d930e674e21ca4c00ba30c0877cd3728b5bd5874588671',
					'eddeb37070a19e1277db5ec34ea12225e84ccece9e6b2bb1bb27c3ba3999dac7',
					'9771b09041466268948626830cbfea5a043527f39174d70e11a80011f386bb57',
					'b3953cb16e2457b9be78ad8c8a2985435dedaed5f0dd63443bdfbccc92d09f2d',
					'f147c1cba67acad603309d5004f25d9ab41ae073b318f4c6f972f96106c9b527',
					'ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
					'93ec60444c28e8b8c0f1a613ed41f518b637280c454188e5500ea4e54e1a2f12',
					'247bf1854471c1a97ccc363c63e876bb6b9a7f06038486048a17196a8a5493dc',
					'1b774b27f49f4fe43cc8218e230bc39d0b16d0ee68abe828585ef87d316493ac',
					'1305f8955a240a464393f52867d17ba271454fa2a6f2249fb5901b86e7c7334e',
					'adbe299504da4e6cf9d7eb481bdf72f23e6a0332df8049b4a018b99604e394da',
					'41bb70d08312d9c17ec89a4577d30da77d5b936594fc06ccb0646602bed6ad40',
					'5c4a92f575822b2d2deaa4bc0985ec9a57a17719bd5427af634ec1b4bf9c045b',
					'186ffbe710bc27690934ef6cd64aeda2afdd634cbbaf6d23310ca7a31ab96e60',
					'2d59fbcce531fb9661cdfa8371c49b6898ce0895fe71da88ffec851c7ed60782',
					'484beb54e2990e17c18119b6065d00c8a65954039ec2d40a9e4ac41862dc561e',
					'1681920f9cb83ff2590a8e5c502a7015d4834f5365cf5ed17392c9c78147f94d',
					'7e838ec9b59a50d2c3333f079b0489871f12c1726eff483c3a88a287dbe36713',
					'130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0',
					'9172179a88f8cfeeb81518ad31da4397555273b8658eb3ea2d1eca7965d8e615',
					'aad413159fe85e4f4d1941166ddcc97850f5964ee2ef8bda95519d019af8d488',
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					'feac3a6303ac41ebb9561d52fe2f3b4271fe846d2d2ffae722f18b6f04fc4ce9',
					'c7a0f96797a9dc3085534463650a09e1f160fecb6c0ec6c21e74ef2a222b73a4',
					'e36f75a27598512c2f4ad06fffeeffa37d3aad81c3a4edb77d871ec0ee933471',
					'eaa5ccb65e635e9ad3ebd98c2b7402b3a7c048fcd300c2d8aed8864f621ee6b2',
					'2cb967f6c73d9b6b8604d7b199271fed3183ff18ae0bd9cde6d6ef6072f83c05',
					'76c321881c08b0c2f538abf753044603ab3081f5441fe069c125a6e2803015da',
					'f8fa9e01047c19102133d2af06aab6cc377d5665bede412f04f81bcdc368d00e',
					'f91766de68f3a8859a3634c3a0fdde38ebd82dd91fc37b67ac6cf010800a3e6e',
					'b70f1d97cd254e93e2dd7b24567b3dbe06a60b5cbabe3443463c61cb87879b47',
					'f88b86d0a104bda71b2ff4d8234fef4e184ee771a9c2d3a298280790c185231b',
					'b6de69ebd1ba0bfe2d37ea6733c64b7e3eb262bee6c9cee05034b0b4465e2678',
					'b73fa499a7794c111fcd011cdc7dcc426341a28c6c2d6a32b8d7d028dcb8493f',
					'0a13f5d075186bc99b9ec5b7bd3fbaeee0ab68a9314ac8d12a1f562e82d5e1c5',
					'e0f1c6cca365cd61bbb01cfb454828a698fa4b7170e85a597dde510567f9dda5',
					'5386c93dbc76fce1e3a5ae5436ba98bb39e6a0929d038ee2118af54afd45614a',
					'e5c785871ac07632b42bc3862e7035330ff44fb0314e2253d1d7c0a35f3866f9',
					'c88af4585b4fabba89e8015bcf180c38a8027a8057dcf575977875a361282d7b',
					'a0f768d6476a9cfec1a64a895064fe114b26bd3fb6aeda397ccce7ef7f3f98ef',
					'6cb825715058d2e821aa4af75fbd0da52181910d9fda90fabe73cd533eeb6acb',
					'a2c3a994fdf110802d5856ff18f306e7a3731452ed7a0fed8aac48e58fd729aa',
					'fbac76743fad9448ed0b45fb4c97a62f81a358908aa14f6a2c76d2a8dc207141',
					'de918e28b554600a81cbf119abf5414648b58a8efafbc3b0481df0242684dc1b',
					'90ad9bfed339af2d6b4b3b7f7cdf25d927b255f9f25dbbc892ee9ca57ef67807',
					'a40c3e1549a9bbea71606ef05b793629923bdb151390145e3730dfe2b28b9217',
					'e7ac617b33d0f019d9d030c2e34870767d8994680e7b10ebdaf2af0e59332524',
					'b851863cf6b4769df5cecca718463173485bb9fe21e20f7cfb0802f5ab5973c2',
					'33e8874f91f2b1295a2218e8d9f83761827a8d326fbc23e26b52a527714e75f0',
					'faf9f863e704f9cf560bc7a5718a25d851666d38195cba3cacd360cd5fa96fd3',
					'a2fc2420262f081d0f6426364301ef40597756e163f6b1fd813eff9b03594125',
					'8966b54a95b327651e3103d8adb69579ff50bf22a004a65731a41f7caca2859f',
					'db4b4db208667f9266e8a4d7fad9d8b2e711891175a21ee5f5f2cd088d1d8083',
					'6971dc02efc00140fbfcb262dd6f84d2dee533b258427de7017528b2e10ac2b1',
					'613e4178a65c1194192eaa29910f0ecca3737f92587dd05d58c6435da41220f6',
					'e4717693ad6a02a4e6615e1ad4070fdf24d6a628a9d19a8396e4c91018a11307',
					'a81d59b68ba8942d60c74d10bc6488adec2ae1fa9b564a22447289076fe7b1e4',
					'c119a622b3ea85727b236574c43e83350252973ae765bb2061623a13c4f3d431',
					'ca1285393e1848ee41ba0c5e47789e5e0c570a7b51d8e2f7f6db37417b892cf9',
					'b690204a2a4a39431b8aaa4bb9af4e53aead93d2d46c5042edada9f5d43d6cd3',
					'9c99976107b5d98e5669452392d912edf33c968e5832b52f2eedcd044b5cc2f2',
					'942972349c8f2afe93ad874b3f19de05de7e34c120b23803438c7eeb8e6113b7',
					'7fba92f4a2a510ae7301dddddf136e1f8673b54fd0ff0d92ec63f59b68bf4a8f',
					'abe994f962c34d7997506a657beee403f6b807eb2b2605dc6c3b93bb67b839eb',
					'0fec636f5866c66f63a0d3db9b00e3cd5ba1b3a0324712c7935ae845dbfcf58a',
					'63db2063e7760b241b0fe69436834fa2b759746b8237e1aafd2e099a38fc64d6',
					'72f0cd8486d8627b5bd4f10c2e592a4512ac58e572edb3e37c0448b3ac7dd405',
					'3345cae6361e329bc931fda1245e263617c797c8b21b7abfb7914fcda1a7833b',
					'77c59f444c8a49bcd354759cc912166fe6eaa603a5f9d4a9525405b30a52ac10',
					'45ab8f54edff6b802335dc3ea5cd5bc5324e4031c0598a2cdcae79402e4941f8',
					'465085ba003a03d1fed0cfd35b7f3c07927c9db41d32194d273f8fe2fa238faa',
					'b68f666f1ede5615bf382958a815988a42aea8e4e03fbf0470a57bceac7714db',
					'c58078a7d12d81190ef0c5deb7611f97fc923d064647b66b9b25512029a13daf',
					'd9299750eeb71720dda470bccb8fafa57cf13f4939749615642c75a191481dea',
					'2f58f5b6b1e2e91a9634dfadd1d6726a5aed2875f33260b6753cb9ec7da72917',
					'0c0c8f58e7feeaa687d7dc9a5146ea14afe1bc647f518990b197b9f55728effa',
					'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
					'47226b469031d48f215973a11876c3f03a6d74360b40a55192b2ba9e5a74ede5',
					'88260051bbe6634431f8a2f3ac66680d1ee9ef1087222e6823d9b4d81170edc7',
					'619a3113c6cb1d3db7ef9731e6e06b618296815b3cfe7ca8d23f3767198b00ea',
					'7ac9d4b708fb19eaa200eb883be56601ddceed96290a3a033114750b7fda9d0b',
					'fd039dd8caa03d58c0ecbaa09069403e7faff864dccd5933da50a41973292fa1',
					'b7633636a88ba1ce8acd98aa58b4a9618650c8ab860c167be6f8d78404265bae',
					'f495866ce86de18d8d4e746fca6a3a130608e5882875b88908b6551104f28e6a',
					'31e1174043091ab0feb8d1e2ada4041a0ff54d0ced1e809890940bd706ffc201',
					'e44b43666fc2a9982c6cd9cb617e4685d7b7cf9fc05e16935f41c7052bb3e15f',
					'f54ce2a222ab3513c49e586464d89a2a7d9959ecce60729289ec0bb6106bd4ce'
				];
				var expectedDelegates = generateDelegatesList(round, delegates);

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					expect(rows).to.be.an('array').and.lengthOf(1);
					expect(rows[0]).to.be.an('object');
					expect(rows[0].delegates).to.be.an('array').and.lengthOf(delegates.length);
					for (var i = rows[0].delegates.length - 1; i >= 0; i--) {
						expect(rows[0].delegates[i]).to.equal(expectedDelegates[i]);
					}
					expect(rows[0].delegates[0]).to.equal('b7633636a88ba1ce8acd98aa58b4a9618650c8ab860c167be6f8d78404265bae');
					expect(rows[0].delegates[1]).to.equal('1681920f9cb83ff2590a8e5c502a7015d4834f5365cf5ed17392c9c78147f94d');
					expect(rows[0].delegates[2]).to.equal('186ffbe710bc27690934ef6cd64aeda2afdd634cbbaf6d23310ca7a31ab96e60');
					expect(rows[0].delegates[3]).to.equal('0a13f5d075186bc99b9ec5b7bd3fbaeee0ab68a9314ac8d12a1f562e82d5e1c5');
					expect(rows[0].delegates[4]).to.equal('25e961fa459d202816776c8736560d493a94fdd7381971f63fb9b70479487598');
					expect(rows[0].delegates[5]).to.equal('3345cae6361e329bc931fda1245e263617c797c8b21b7abfb7914fcda1a7833b');
					expect(rows[0].delegates[6]).to.equal('a2c3a994fdf110802d5856ff18f306e7a3731452ed7a0fed8aac48e58fd729aa');
					expect(rows[0].delegates[7]).to.equal('f495866ce86de18d8d4e746fca6a3a130608e5882875b88908b6551104f28e6a');
					expect(rows[0].delegates[8]).to.equal('e36f75a27598512c2f4ad06fffeeffa37d3aad81c3a4edb77d871ec0ee933471');
					expect(rows[0].delegates[9]).to.equal('d12a6aef4b165b0197adb82d0d544202897b95300ff1fff93c339cf866defb0d');
					expect(rows[0].delegates[10]).to.equal('d9299750eeb71720dda470bccb8fafa57cf13f4939749615642c75a191481dea');
					expect(rows[0].delegates[11]).to.equal('77c59f444c8a49bcd354759cc912166fe6eaa603a5f9d4a9525405b30a52ac10');
					expect(rows[0].delegates[12]).to.equal('b73fa499a7794c111fcd011cdc7dcc426341a28c6c2d6a32b8d7d028dcb8493f');
					expect(rows[0].delegates[13]).to.equal('47226b469031d48f215973a11876c3f03a6d74360b40a55192b2ba9e5a74ede5');
					expect(rows[0].delegates[14]).to.equal('393f73238941510379d930e674e21ca4c00ba30c0877cd3728b5bd5874588671');
					expect(rows[0].delegates[15]).to.equal('abe994f962c34d7997506a657beee403f6b807eb2b2605dc6c3b93bb67b839eb');
					expect(rows[0].delegates[16]).to.equal('e4717693ad6a02a4e6615e1ad4070fdf24d6a628a9d19a8396e4c91018a11307');
					expect(rows[0].delegates[17]).to.equal('f91766de68f3a8859a3634c3a0fdde38ebd82dd91fc37b67ac6cf010800a3e6e');
					expect(rows[0].delegates[18]).to.equal('7e838ec9b59a50d2c3333f079b0489871f12c1726eff483c3a88a287dbe36713');
					expect(rows[0].delegates[19]).to.equal('942972349c8f2afe93ad874b3f19de05de7e34c120b23803438c7eeb8e6113b7');
					expect(rows[0].delegates[20]).to.equal('33e8874f91f2b1295a2218e8d9f83761827a8d326fbc23e26b52a527714e75f0');
					expect(rows[0].delegates[21]).to.equal('7ac9d4b708fb19eaa200eb883be56601ddceed96290a3a033114750b7fda9d0b');
					expect(rows[0].delegates[22]).to.equal('90ad9bfed339af2d6b4b3b7f7cdf25d927b255f9f25dbbc892ee9ca57ef67807');
					expect(rows[0].delegates[23]).to.equal('968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b');
					expect(rows[0].delegates[24]).to.equal('adbe299504da4e6cf9d7eb481bdf72f23e6a0332df8049b4a018b99604e394da');
					expect(rows[0].delegates[25]).to.equal('e7ac617b33d0f019d9d030c2e34870767d8994680e7b10ebdaf2af0e59332524');
					expect(rows[0].delegates[26]).to.equal('b002f58531c074c7190714523eec08c48db8c7cfc0c943097db1a2e82ed87f84');
					expect(rows[0].delegates[27]).to.equal('ec111c8ad482445cfe83d811a7edd1f1d2765079c99d7d958cca1354740b7614');
					expect(rows[0].delegates[28]).to.equal('c88af4585b4fabba89e8015bcf180c38a8027a8057dcf575977875a361282d7b');
					expect(rows[0].delegates[29]).to.equal('484beb54e2990e17c18119b6065d00c8a65954039ec2d40a9e4ac41862dc561e');
					expect(rows[0].delegates[30]).to.equal('c119a622b3ea85727b236574c43e83350252973ae765bb2061623a13c4f3d431');
					expect(rows[0].delegates[31]).to.equal('feac3a6303ac41ebb9561d52fe2f3b4271fe846d2d2ffae722f18b6f04fc4ce9');
					expect(rows[0].delegates[32]).to.equal('c7a0f96797a9dc3085534463650a09e1f160fecb6c0ec6c21e74ef2a222b73a4');
					expect(rows[0].delegates[33]).to.equal('e5c785871ac07632b42bc3862e7035330ff44fb0314e2253d1d7c0a35f3866f9');
					expect(rows[0].delegates[34]).to.equal('253e674789632f72c98d47a650f1ca5ece0dbb82f591080471129d57ed88fb8a');
					expect(rows[0].delegates[35]).to.equal('db4b4db208667f9266e8a4d7fad9d8b2e711891175a21ee5f5f2cd088d1d8083');
					expect(rows[0].delegates[36]).to.equal('b6de69ebd1ba0bfe2d37ea6733c64b7e3eb262bee6c9cee05034b0b4465e2678');
					expect(rows[0].delegates[37]).to.equal('6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a');
					expect(rows[0].delegates[38]).to.equal('aad413159fe85e4f4d1941166ddcc97850f5964ee2ef8bda95519d019af8d488');
					expect(rows[0].delegates[39]).to.equal('b690204a2a4a39431b8aaa4bb9af4e53aead93d2d46c5042edada9f5d43d6cd3');
					expect(rows[0].delegates[40]).to.equal('eaa5ccb65e635e9ad3ebd98c2b7402b3a7c048fcd300c2d8aed8864f621ee6b2');
					expect(rows[0].delegates[41]).to.equal('1305f8955a240a464393f52867d17ba271454fa2a6f2249fb5901b86e7c7334e');
					expect(rows[0].delegates[42]).to.equal('1a99630b0ca1642b232888a3119e68b000b6194eced51e7fe3231bbe476f7c10');
					expect(rows[0].delegates[43]).to.equal('31e1174043091ab0feb8d1e2ada4041a0ff54d0ced1e809890940bd706ffc201');
					expect(rows[0].delegates[44]).to.equal('ad936990fb57f7e686763c293e9ca773d1d921888f5235189945a10029cd95b0');
					expect(rows[0].delegates[45]).to.equal('faf9f863e704f9cf560bc7a5718a25d851666d38195cba3cacd360cd5fa96fd3');
					expect(rows[0].delegates[46]).to.equal('a81d59b68ba8942d60c74d10bc6488adec2ae1fa9b564a22447289076fe7b1e4');
					expect(rows[0].delegates[47]).to.equal('1b774b27f49f4fe43cc8218e230bc39d0b16d0ee68abe828585ef87d316493ac');
					expect(rows[0].delegates[48]).to.equal('00de7d28ec3f55f42329667f08352d0d90faa3d2d4e62c883d86d1d7b083dd7c');
					expect(rows[0].delegates[49]).to.equal('e0f1c6cca365cd61bbb01cfb454828a698fa4b7170e85a597dde510567f9dda5');
					expect(rows[0].delegates[50]).to.equal('5386c93dbc76fce1e3a5ae5436ba98bb39e6a0929d038ee2118af54afd45614a');
					expect(rows[0].delegates[51]).to.equal('f54ce2a222ab3513c49e586464d89a2a7d9959ecce60729289ec0bb6106bd4ce');
					expect(rows[0].delegates[52]).to.equal('b70f1d97cd254e93e2dd7b24567b3dbe06a60b5cbabe3443463c61cb87879b47');
					expect(rows[0].delegates[53]).to.equal('613e4178a65c1194192eaa29910f0ecca3737f92587dd05d58c6435da41220f6');
					expect(rows[0].delegates[54]).to.equal('6cb825715058d2e821aa4af75fbd0da52181910d9fda90fabe73cd533eeb6acb');
					expect(rows[0].delegates[55]).to.equal('76c321881c08b0c2f538abf753044603ab3081f5441fe069c125a6e2803015da');
					expect(rows[0].delegates[56]).to.equal('9172179a88f8cfeeb81518ad31da4397555273b8658eb3ea2d1eca7965d8e615');
					expect(rows[0].delegates[57]).to.equal('41bb70d08312d9c17ec89a4577d30da77d5b936594fc06ccb0646602bed6ad40');
					expect(rows[0].delegates[58]).to.equal('fd039dd8caa03d58c0ecbaa09069403e7faff864dccd5933da50a41973292fa1');
					expect(rows[0].delegates[59]).to.equal('a40c3e1549a9bbea71606ef05b793629923bdb151390145e3730dfe2b28b9217');
					expect(rows[0].delegates[60]).to.equal('f88b86d0a104bda71b2ff4d8234fef4e184ee771a9c2d3a298280790c185231b');
					expect(rows[0].delegates[61]).to.equal('88260051bbe6634431f8a2f3ac66680d1ee9ef1087222e6823d9b4d81170edc7');
					expect(rows[0].delegates[62]).to.equal('0fec636f5866c66f63a0d3db9b00e3cd5ba1b3a0324712c7935ae845dbfcf58a');
					expect(rows[0].delegates[63]).to.equal('677c79b243ed96a8439e8bd193d6ab966ce43c9aa18830d2b9eb8974455d79f8');
					expect(rows[0].delegates[64]).to.equal('a2fc2420262f081d0f6426364301ef40597756e163f6b1fd813eff9b03594125');
					expect(rows[0].delegates[65]).to.equal('de918e28b554600a81cbf119abf5414648b58a8efafbc3b0481df0242684dc1b');
					expect(rows[0].delegates[66]).to.equal('c58078a7d12d81190ef0c5deb7611f97fc923d064647b66b9b25512029a13daf');
					expect(rows[0].delegates[67]).to.equal('619a3113c6cb1d3db7ef9731e6e06b618296815b3cfe7ca8d23f3767198b00ea');
					expect(rows[0].delegates[68]).to.equal('c4d96fbfe80102f01579945fe0c5fe2a1874a7ffeca6bacef39140f9358e3db6');
					expect(rows[0].delegates[69]).to.equal('b851863cf6b4769df5cecca718463173485bb9fe21e20f7cfb0802f5ab5973c2');
					expect(rows[0].delegates[70]).to.equal('a0f768d6476a9cfec1a64a895064fe114b26bd3fb6aeda397ccce7ef7f3f98ef');
					expect(rows[0].delegates[71]).to.equal('5c4a92f575822b2d2deaa4bc0985ec9a57a17719bd5427af634ec1b4bf9c045b');
					expect(rows[0].delegates[72]).to.equal('2493d52fc34ecaaa4a7d0d76e6de9bda24f1b5e11e3363c30a13d59e9c345f82');
					expect(rows[0].delegates[73]).to.equal('2cb967f6c73d9b6b8604d7b199271fed3183ff18ae0bd9cde6d6ef6072f83c05');
					expect(rows[0].delegates[74]).to.equal('9c99976107b5d98e5669452392d912edf33c968e5832b52f2eedcd044b5cc2f2');
					expect(rows[0].delegates[75]).to.equal('ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba');
					expect(rows[0].delegates[76]).to.equal('ca1285393e1848ee41ba0c5e47789e5e0c570a7b51d8e2f7f6db37417b892cf9');
					expect(rows[0].delegates[77]).to.equal('6971dc02efc00140fbfcb262dd6f84d2dee533b258427de7017528b2e10ac2b1');
					expect(rows[0].delegates[78]).to.equal('b3953cb16e2457b9be78ad8c8a2985435dedaed5f0dd63443bdfbccc92d09f2d');
					expect(rows[0].delegates[79]).to.equal('63db2063e7760b241b0fe69436834fa2b759746b8237e1aafd2e099a38fc64d6');
					expect(rows[0].delegates[80]).to.equal('f8fa9e01047c19102133d2af06aab6cc377d5665bede412f04f81bcdc368d00e');
					expect(rows[0].delegates[81]).to.equal('93ec60444c28e8b8c0f1a613ed41f518b637280c454188e5500ea4e54e1a2f12');
					expect(rows[0].delegates[82]).to.equal('130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0');
					expect(rows[0].delegates[83]).to.equal('0c0c8f58e7feeaa687d7dc9a5146ea14afe1bc647f518990b197b9f55728effa');
					expect(rows[0].delegates[84]).to.equal('b68f666f1ede5615bf382958a815988a42aea8e4e03fbf0470a57bceac7714db');
					expect(rows[0].delegates[85]).to.equal('32f20bee855238630b0f791560c02cf93014977b4b25c19ef93cd92220390276');
					expect(rows[0].delegates[86]).to.equal('45ab8f54edff6b802335dc3ea5cd5bc5324e4031c0598a2cdcae79402e4941f8');
					expect(rows[0].delegates[87]).to.equal('f147c1cba67acad603309d5004f25d9ab41ae073b318f4c6f972f96106c9b527');
					expect(rows[0].delegates[88]).to.equal('72f0cd8486d8627b5bd4f10c2e592a4512ac58e572edb3e37c0448b3ac7dd405');
					expect(rows[0].delegates[89]).to.equal('326bff18531703385d4037e5585b001e732c4a68afb8f82efe2b46c27dcf05aa');
					expect(rows[0].delegates[90]).to.equal('fbac76743fad9448ed0b45fb4c97a62f81a358908aa14f6a2c76d2a8dc207141');
					expect(rows[0].delegates[91]).to.equal('2f58f5b6b1e2e91a9634dfadd1d6726a5aed2875f33260b6753cb9ec7da72917');
					expect(rows[0].delegates[92]).to.equal('9771b09041466268948626830cbfea5a043527f39174d70e11a80011f386bb57');
					expect(rows[0].delegates[93]).to.equal('76ceefed8f29dd48664b07d207f4bf202122f2ffed6dcefa802d7fe348203b88');
					expect(rows[0].delegates[94]).to.equal('247bf1854471c1a97ccc363c63e876bb6b9a7f06038486048a17196a8a5493dc');
					expect(rows[0].delegates[95]).to.equal('8966b54a95b327651e3103d8adb69579ff50bf22a004a65731a41f7caca2859f');
					expect(rows[0].delegates[96]).to.equal('7fba92f4a2a510ae7301dddddf136e1f8673b54fd0ff0d92ec63f59b68bf4a8f');
					expect(rows[0].delegates[97]).to.equal('2d59fbcce531fb9661cdfa8371c49b6898ce0895fe71da88ffec851c7ed60782');
					expect(rows[0].delegates[98]).to.equal('465085ba003a03d1fed0cfd35b7f3c07927c9db41d32194d273f8fe2fa238faa');
					expect(rows[0].delegates[99]).to.equal('e44b43666fc2a9982c6cd9cb617e4685d7b7cf9fc05e16935f41c7052bb3e15f');
					expect(rows[0].delegates[100]).to.equal('eddeb37070a19e1277db5ec34ea12225e84ccece9e6b2bb1bb27c3ba3999dac7');
					done();
				}).catch(done);
			});
		});

		describe('exceptions', function () {

			it('should raise exception for round 0', function (done) {
				var round = '0';
				var delegates = ['1'];

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for undefined round', function (done) {
				var round = undefined;
				var delegates = ['1'];

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for null round', function (done) {
				var round = null;
				var delegates = ['1'];

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for negative round', function (done) {
				var round = -1;
				var delegates = ['1'];

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for empty delegates', function (done) {
				var round = 1;
				var delegates = [];

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('cannot determine type of empty array');
					done();
				});
			});

			it('should raise exception for empty delegates', function (done) {
				var round = 1;
				var delegates = [];

				db.query(sql.generateDelegatesListCast, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for null delegates', function (done) {
				var round = 1;
				var delegates = null;

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});

			it('should raise exception for null delegates', function (done) {
				var round = 1;
				var delegates = undefined;

				db.query(sql.generateDelegatesList, {round: round, delegates: delegates}).then(function (rows) {
					done('Should not pass');
				}).catch(function (err) {
					expect(err).to.be.an('error');
					expect(err.message).to.contain('Invalid parameters supplied');
					done();
				});
			});
		});
	});

	describe('getDelegatesList()', function () {

		it('SQL results should be equal to native - real 101 delegates from current database', function (done) {
			db.task(function (t) {
				return t.batch([
					t.query(sql.getDelegatesList),
					t.query(sql.getActiveDelegates),
					t.query(sql.getRound)
				]);
			}).then(function (res) {
				var delegates_list   = res[0][0].list;
				var active_delegates = res[1][0].delegates;
				var round            = res[2][0].round;
				
				var expectedDelegates = generateDelegatesList(round.toString(), active_delegates);
				expect(delegates_list).to.deep.equal(expectedDelegates);

				done();
			}).catch(done);
		});
	});
});
