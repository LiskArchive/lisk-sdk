/*
 * Copyright © 2020 Lisk Foundation
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
// writeBoolean x 3,543,238 ops/sec ±1.59% (89 runs sampled)

const { Suite } = require('benchmark');
const { codec } = require('../dist-node/codec');

const suite = new Suite();

const biggestMultisigTransactionRegistration = {
	senderPublicKey: Buffer.from(
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		'hex',
	),
	nonce: 1,
	fee: BigInt(1500000000),
	type: 12,
	asset: {
		mandatoryKeys: [
			Buffer.from(
				'd0d49f8798675bd47e959f6bf82b6d06c7c65079282eaa5e48e3f97272444dad',
				'hex',
			),
			Buffer.from(
				'843fc4a097049ef5495b98886f3d49e2c7af6da7997cee1fb0924c7eeffd659b',
				'hex',
			),
			Buffer.from(
				'8397fb0c9f925f05611a0761a86a1d1cc94aa6e5042188b28a86797ef98aa570',
				'hex',
			),
			Buffer.from(
				'037793853578dc22ac0300fcaf6f6a48f9b7756acda9f72968703d9d85e0cbd9',
				'hex',
			),
			Buffer.from(
				'eb5d59d05437b4769cc5dddfa2905407be5ba407681582d8d83f59e7a41e3b5f',
				'hex',
			),
			Buffer.from(
				'90d8491360b7756098d4f3c9f7e57eb610dce829a9139ea674e41626bffbea96',
				'hex',
			),
			Buffer.from(
				'914d2fa3422d7ba3231238e858d6fc1a3912152ef315d22d455deb7b87bbe7e6',
				'hex',
			),
			Buffer.from(
				'8d8eabce4592f213635201442a4966c263a38f919816fc1b779e3dcbcc4f2107',
				'hex',
			),
			Buffer.from(
				'e1c65a5329806611f19a201469f3030f713f4affdb215d2d8b830e654177a275',
				'hex',
			),
			Buffer.from(
				'1d7e27f168266f86193ea0d68d1aec723e936934aae527bce0624984690232e3',
				'hex',
			),
			Buffer.from(
				'9e006c0cb22ccca0ecad7ec880edb8301b7533af19dcc1b708ac7e5496e82dc3',
				'hex',
			),
			Buffer.from(
				'0c38d9e4776e6eabff0107694bd4628c066589d2264733fe0db30e205ac03904',
				'hex',
			),
			Buffer.from(
				'2cdc2e19b23662cf971b4508eeeef0dd98b4bffd76ad0adeab5ab2b94a77f257',
				'hex',
			),
			Buffer.from(
				'1685b48cf0b3f22a32f6222c79d8d540ef67260f93896065a9894f1a550e566a',
				'hex',
			),
			Buffer.from(
				'ffc83fd966e4f0107bad200f417f5baa6e2659045f45f9472c030937f08f265c',
				'hex',
			),
			Buffer.from(
				'176437bac61be4418c7810a84f800602db77984321b36e6813b3437d37528fff',
				'hex',
			),
			Buffer.from(
				'28c5dba745e9710d6c3d6c644a1f757750c605ee17e335642d6069010d02511c',
				'hex',
			),
			Buffer.from(
				'e8208a3a2d0620b9c0544c50e1923c7c8adb6e0b8b769a74a4d0beea28a8686f',
				'hex',
			),
			Buffer.from(
				'11f4f7b1bc570ac00275917741a99c6a001afa098ac99f8de5496c5d52d10727',
				'hex',
			),
			Buffer.from(
				'8437c477831b2426bcf074efa91910e89496465e33a33e180e768a8295bd9423',
				'hex',
			),
			Buffer.from(
				'97e9d7c6854a3181205547ca6167ee687407f524a802250016166008c31b48ed',
				'hex',
			),
			Buffer.from(
				'0867e919b7d413210062cff39910532cf6f52b006b94af7feafec058065222d8',
				'hex',
			),
			Buffer.from(
				'fe264b878064a19867b7a1776f78414e130bf9982adb7aaeef239cf9ef014c0c',
				'hex',
			),
			Buffer.from(
				'3e9e4adb6d9916431e0018da806b35c8e42a02c9d2932b1bcc846a46fa2c1404',
				'hex',
			),
			Buffer.from(
				'3c8c889775c3f7a55c2830167a1f333d02f0b5a703de80dc009d1fc70da163bf',
				'hex',
			),
			Buffer.from(
				'c8a7b274ca0e72e61afac372dc4af12a536635432fe3f689e3b2e09cfe06a3b7',
				'hex',
			),
			Buffer.from(
				'fd7b26b20d3bf421dde39cd2b682a1173484ae45d273983e21bd52f56ac8a67f',
				'hex',
			),
			Buffer.from(
				'f71b71985e6fa9338cca8af3214f05a33978a7e5e87d3c696e604c4ef51f1ef4',
				'hex',
			),
			Buffer.from(
				'3e2e19504e34d5403b7773756a7ffcdd72e1fd7877f3900becd5773dae721372',
				'hex',
			),
			Buffer.from(
				'69c6cc198981daf7d045b1a859c14b2df84ccb5abbaaab1786ac34f01fdf783b',
				'hex',
			),
			Buffer.from(
				'9bc2203f976cc165b4f683afbc337aa5bbb117ae5471716ca5d2a2d6ed15f85c',
				'hex',
			),
			Buffer.from(
				'7c2ad0b0a2b278a4f359ed0bc25ea1c3bb573974e3a8a8624cb4c0e1a312d20e',
				'hex',
			),
			Buffer.from(
				'3c025e87660fb9399411bb6738a673a11ae881c9508cc5abc1552fba54e8ae6e',
				'hex',
			),
			Buffer.from(
				'a853a32f8695e15879fbdb6a9a440966cf71525a91df7b4ffd869ff850be1d03',
				'hex',
			),
			Buffer.from(
				'931332e31786a72c43821d7217b476199d503f35e9fee9bf9ef8b5190269b475',
				'hex',
			),
			Buffer.from(
				'b34e268fc98b657f74796adcb74c75b624ff1c261ff68a818ecf29839ba55e50',
				'hex',
			),
			Buffer.from(
				'7644124c92dd945ba9b41db4f97144a966ea4b996940357c40416cdca265cbd5',
				'hex',
			),
			Buffer.from(
				'212f62dc3a75e70154b4ce2a23567b162b750dcc0503872117fda7c0a5a99926',
				'hex',
			),
			Buffer.from(
				'1ef8b3df2b2fb109341a6120a0811a2a08bb7dc1bc78ab1eaeeba81957cb2868',
				'hex',
			),
			Buffer.from(
				'90b3382069e4217c8278feb60499746983939d093cc3b3671b51686926657596',
				'hex',
			),
			Buffer.from(
				'8ba33a1bc313aec22962b057db5d5481cf66b046a8f5c9f0e9a2b01c718c891b',
				'hex',
			),
			Buffer.from(
				'669e5afa09862e11307d1cae4825b5ecd7446ca3b74692a25bd2058661ed3868',
				'hex',
			),
			Buffer.from(
				'6e7e4443d5a1ab2a1b21d540c503a6ff0410b6e8496b88d3af1eee30f701207c',
				'hex',
			),
			Buffer.from(
				'7853117e2d3bee9be19cb202441709e2d39920704d3829aff15c8bb147792187',
				'hex',
			),
		],
		optionalKeys: [
			Buffer.from(
				'2be7ef46cfc5d52e6b667b069767c694b3f59fb5b8c4a4418c7d025b582fdc0d',
				'hex',
			),
			Buffer.from(
				'62128ce026e15852a196e5e96257030577e22c66882377b880e552626c467a2d',
				'hex',
			),
			Buffer.from(
				'08c0e1522a5d83d8cfd51111b14f58a38aa8e74dad55bd6d93d16f8cda3c3f48',
				'hex',
			),
			Buffer.from(
				'162641bf4eec471b3d51d9413c3aaa00db03186a19326cfc6e94ae9ce67c6a3a',
				'hex',
			),
			Buffer.from(
				'f9e8c74b0a3c91350ed38d2095455bb65599dde5f5ee2e540e1976c6c28330b9',
				'hex',
			),
			Buffer.from(
				'f0038c89ff1471381f76ea18da48ab2fd5b89d59e780d8417a00882545368f96',
				'hex',
			),
			Buffer.from(
				'7e06428cd4c340388eecec1ee9c9f06b9150845ad8cae7937dbb89acc78e9e93',
				'hex',
			),
			Buffer.from(
				'110cd994c2e9f6bfe47499966a63a6f2a428dd8a18ff45825e6d89fb540d793b',
				'hex',
			),
			Buffer.from(
				'd3729facd6f4f66fc76ba9b92fe99b12b9b2a1e758fa775fdb37a3a00c9c6797',
				'hex',
			),
			Buffer.from(
				'004f1eae8f8c04ff24e1c06f611af862316d75f9bf0aed7b324ee56d60dc92f2',
				'hex',
			),
			Buffer.from(
				'53e87ba6b15c8ae227155651093a71456ea5a1ca1cea02d7b88d5f04e2aa93e2',
				'hex',
			),
			Buffer.from(
				'8e46dfc184b95e73b1c327d9f4d36bbac3c9f9d2d9ce0339180dcfcdac08cf5c',
				'hex',
			),
			Buffer.from(
				'92eaaa35e74c4ef7f8057ac58611acddaa76ba2c33fb23207b4f435e41ef6824',
				'hex',
			),
			Buffer.from(
				'29e1f34c3df087f02da1384fac0e15b102f6010ccd960eeb61d886ea734242d1',
				'hex',
			),
			Buffer.from(
				'1ee4f9954c1ea6121229a1e30931fb246d7d822d4a3522f0e70b87e93627ac4f',
				'hex',
			),
			Buffer.from(
				'0336c0724d450d99274f2402a6410a9afc5dc4dafa87ed6086a321ac5c82bf90',
				'hex',
			),
			Buffer.from(
				'4ceafc674628d10aae232c03b0229191e3a45ae0d31dd6568b8c2cda27b9d0df',
				'hex',
			),
			Buffer.from(
				'f38076b123cc23269b1328af476365f8ade009ebe99f1e106c6aa1208eb269bd',
				'hex',
			),
			Buffer.from(
				'77246733b377f919ce048a282a5d715016c7d4cdb514ecf088571f777838f34e',
				'hex',
			),
			Buffer.from(
				'7d1655ab4fa2d828b7656162c46b2c7d251dede5e3c36c68d31e309cd896e00d',
				'hex',
			),
		],
		numberOfSignatures: 44,
	},
	signatures: [
		Buffer.from(
			'4d38666425327e3c950cef3d5d6bed86b7a32e32002651a49ed5dbd0143d9b2fe94d1aa970ff6492da8e174f844d3c4736f980b322d35b76903969c48375ad8a',
			'hex',
		),
		Buffer.from(
			'644abb27920144bb4e4a5030e77cbdc53ea03fb9dd4ecd9abb8a5653c581f766b4ca6f33ce5f603330959e2f8263ae187c35b1840a840107cb42899bf854db01',
			'hex',
		),
		Buffer.from(
			'a20859fecfbd7a4a8172fc740e69abda576d508b41c5a952a5c545e0d8cd2625f22a1b1b16e8eea3ce6694e409c7ee36e94c9cc08127ea5a83745af0a06cc576',
			'hex',
		),
		Buffer.from(
			'd4c0eb97d2df39576e95b8c12cc6883d0e71d7e792c054d7150bcca061061b8e19cb9ef0a90d694eec17cecb8bf33e1b514cda2478298f6d09489f8fefe0ced6',
			'hex',
		),
		Buffer.from(
			'630755a2fb1cf34f308a6ddc6866da2a9ae4a57b13b11a1ce4990e289f3b4ffb4cbf0363ab3c5f539c167b236be4ceef4daff86be833ad76079853d4934a035e',
			'hex',
		),
		Buffer.from(
			'8347b0c139071fe4ce90ca53b83d557522bd3384ebc918afb45e9895800ab269e6bc4ae4390222d28a05c2a1b00d3dc55b81b8db85741d9d321c71189a1a4f87',
			'hex',
		),
		Buffer.from(
			'f378fff268a79c98ae946304469e8c69d26c342665b07873a6cb4042489431ada8c3ba81b847fad6cd4443f604d71ee371a53ab2c9500bc7df7667207d96a373',
			'hex',
		),
		Buffer.from(
			'bd4d1ea1384317f8977de741bbd54229728a06d7259cbf45800d309e5ee8bfcf3c85f7c19afaeedfe6efb70311c79a7570fe6a14a37c5316fdf7fb95fbdd5e3a',
			'hex',
		),
		Buffer.from(
			'82fbaca37405db859bff461fe8ee5184ca327b55d590b4b8db0e89f51c545d281d0affb7f6bb6ea9552026f7b1ca858337eb1dd322b1ba1b533bbb58c3565eca',
			'hex',
		),
		Buffer.from(
			'ea3f88fb092982051bf3ef6a35771278ff33855a1a5632561bd6b8d70ca8717d59c2beff5cb3c99bc85b0e59f149bbef96a23eb1d30298c656824c46bf899e40',
			'hex',
		),
		Buffer.from(
			'1652e7d595d7a200cc465371ec6c9ed21b301ee2ba127d8e09fc7d83189ee8daa856c25ee4309bb2304a37645752840b90e064ee0948b1752cc9b6e4c1560a07',
			'hex',
		),
		Buffer.from(
			'834c25f2f69b861bbaa3a88f34f91515ef338583cd5b88230c2d3746eef14991e4495878d3ce61800db4a5fcad07f84a132f081a297641470e3b42a7a28d9e04',
			'hex',
		),
		Buffer.from(
			'32cebb9e67128017f4521e620d4921bd777314eb06d8f64bde43a2701d7988c413d49907b7cd947823eb9b352fe31e45077287925036aab8fcc84c7fe96956cc',
			'hex',
		),
		Buffer.from(
			'0be3fc36853786b88384d941f2cdb83e435b7254268c2465171f9d3c46f76014e9d3445b27b64359ad80e7bd80874fd91e3dc1cd24d5320944ce0db9373dcfb9',
			'hex',
		),
		Buffer.from(
			'a3319caf35e22c0ef4d5024ad32d7276dfb0fe51699167c5cab7b6ba658b2ebd2316c86213dd8410b9fb280eae57d38283344ac5301d89561767c01fa71025b4',
			'hex',
		),
		Buffer.from(
			'5b0e07fdfb5ff042a64fdc51971bef02314990a665b6635d8188220d688dda617b5b88a45961050462ad513b7b343f0d436c206434cba6f57670180e3bef1891',
			'hex',
		),
		Buffer.from(
			'95df2e48ad98f68dd3a5d3750af788db3713448579a2ed05ef382ab2f66e247827d73b927d9fa7dfd41306c311ed19c7d9df9912d183bccca4aabf20f7f24b12',
			'hex',
		),
		Buffer.from(
			'1346923d836f51177ba3fe31c051ee4f1e9d9d49461359d9dac1d8228614ac4695fa9f3e33329cbe6431e1c8bb5153263cd702d55528cd7a5a4493cf820c5e6f',
			'hex',
		),
		Buffer.from(
			'b2016c73eb8a7b38643957f2d10a991ffd8a2f99ef656fc27ce94ffb858756e9f83954e5282ff69bdddff381e28fe7e86fc6fd8a4781d97198a25288d466b1d4',
			'hex',
		),
		Buffer.from(
			'8efc83f30d2fddf992c37b1defb478cb595dc3d0eae005028a4e3e872678e6d2a1bd176763fba1d2dfdf6d86549bad391e6f70bfccf6660c11f85daa02a4d227',
			'hex',
		),
		Buffer.from(
			'04ebe5fca3871f5cd3c815d9cde5bf5519d9d0489688eb716a7af6863fe2f8986d0d7702922aaeeb48f5c25328a405419037a1974b0e2292a3825d1d48b60158',
			'hex',
		),
		Buffer.from(
			'025ce3ecf8f221d3b3ae644c6750cf6c35c6defc3b07ba45b5f91a52e636cce4570bbf2cbbc0f0891dea955c67c41c2608ae2b083ddf8cde3ffc38fd3f902f6c',
			'hex',
		),
		Buffer.from(
			'd2abbd95622d749ac0408c9e767e713e8015717c43472c728034bde5cba4df2186e81d638782a674175d3a93b64214cbda38f64c65ee99d9ffd4c543bd6a7fde',
			'hex',
		),
		Buffer.from(
			'ed91971a73654b6cbc66501cf345a81e0b5714c4328311bf03dcde18dc14e5b37b7c3714034b2110b6fed25da9d1bbcc5ca3f0ed51f45b08cf4e3bd2ae1ea2df',
			'hex',
		),
		Buffer.from(
			'5dc7e31663527c56aef69f1addbec15fd73ee8ff93718194492a16987f822e3ac51d9b2095b01cf25752a2cffc7009fd02fcf950257ed115a423f4811de06be1',
			'hex',
		),
		Buffer.from(
			'1f075ecf558912babdd29e4551aeaafcb714dc53344b6cfd1ef90163bdb328ef248d22b3a6ca98686fb37d3b038823f76e0df22f500f2372077b6be9539a0a63',
			'hex',
		),
		Buffer.from(
			'033b9956a0d60a861705eafab08209156286bc6a5e0e2d1eef3692781bfc33ae6428b8c8b193af81098ac47799d88d32ee8128d16e085208966e18fc375a6e54',
			'hex',
		),
		Buffer.from(
			'ed6109ab65df3d4d5fefadd0268ba22e65da15d6cee5c19a26fd5c8a4f20aa4fd1ad6f8a8d2cdd97d78908efcb08bd1765be7364cf4eb6c1b872c7e41fb499dc',
			'hex',
		),
		Buffer.from(
			'8d15945b5d3cfb055026eab29c6776939f12aac5c51224159513af27e22beeed50c046c9071cce59ec0f6fc5576604468cf66e0ceb033c91ae1164a494bbb2b5',
			'hex',
		),
		Buffer.from(
			'1a0cc21131ba0b46871c5f963d6d8389019fe8254dff2b6f8a18ad96a81c7e3084677a345eb0125a5ce77d27ffec4279183aa874da466625ba5f8466fa950364',
			'hex',
		),
		Buffer.from(
			'526612cabb51b33ac478af96a5af368c68983592a046c5b2e4d8d856d6f1e18ecb76aaf9c337ceaf88f83607f20ec899a44d16377c6bfa2f4378a582d0883542',
			'hex',
		),
		Buffer.from(
			'5a01d7f9d1ed2456578feeacd619c9b4ad9a6cc7d5aca108f15549ffd55a06f9ecbbd289c041be04056085926216a337b4c9fd6734f066a16d84aa7f9506aa8a',
			'hex',
		),
		Buffer.from(
			'd9c13fa100a2b51b3b588fdfc096ff90acffe86acfaa6085c725a38a2ae2fbce318354d3d4aa0948f94538351976cd3e40e6e339d6dcad8a435d292eee35176c',
			'hex',
		),
		Buffer.from(
			'21526e4124db054803e0095f8fb90c07bdf875f389d7f3a36d36f8d734fe4ca1c3bc9d2658f66b50c3845996cd7b097a6181ab0bc6b64873e86101ca667a9a48',
			'hex',
		),
		Buffer.from(
			'46230cf1b3eeca92e57c99c3f8769e0362ced3cefdb01519ce64f6a624667d6b208b17b2250873c405d3bfca42153148e90c390f00534b404a763b14b501b7ce',
			'hex',
		),
		Buffer.from(
			'a35be608a26e0379281783b7a11ed337e41036b703f3de136dfc40261802a4187ec83fe958a6ec10de40592537368be2f283560ed768c92021482208c70f11c6',
			'hex',
		),
		Buffer.from(
			'bef33369256747cbde6b227dae9153edc8c5beb4776183acf654e8b1ac1029f6f342d69f0c4b1f177e201601b1a10044cd30a3af8388452cc6ad78461814b02a',
			'hex',
		),
		Buffer.from(
			'4b9316f65da34a4f005562ee50a33f11fed4846e35f0e889afecc7c8cc7a6d6afcd35afba1ca02ff722b9eb3886ccf485901bfec465fb0756b2d00ef10bceee0',
			'hex',
		),
		Buffer.from(
			'41ee69e8eb4b3b90c3f7f342ee01f31259895340df0005fdc15c9a549e54d4e54ac1407f0e921633e26dc85849e6733620f02b849f6814b075ebaba5a19962bd',
			'hex',
		),
		Buffer.from(
			'6330f1d37ea07a81d0a214108b61cfa74ffa5cce227488315fb2ca7b279332e6e411fb494d9f7acd82546e7851417373385a38f8c6360be3a074a955692d66f9',
			'hex',
		),
		Buffer.from(
			'239dd74b1872d11a94a836ed37eae165d18b0e664ce773041751048afb235d6075248169f953c50d86c70c9bf9833f186cdbb254feb4cf2098f2e28ca1841bb9',
			'hex',
		),
		Buffer.from(
			'bfceade223b4b23fac1fb997be13c7c20e8b5d860302d690a37c57594a67f1311fb0c88e9b5c9a1756a015b1bcd21a6c4042b7d8292a989774c2260ac6f9ad18',
			'hex',
		),
		Buffer.from(
			'a344dacae58477f5c73ad691370cc361df8b45bbd20b629efe44e815f7b5773e061624c29eaac1af4ba95f8d9a0d4925ba6cfc699cf9eb145d186a439d580912',
			'hex',
		),
		Buffer.from(
			'fc966f32f7ecc239a05d4d31cffca5365ff8d005988cbd5ab13b7eab551f9d27291c34a58b15ffb45980a825f16d3762e3bddad62948e5f32e7f0fa40eb4d5d3',
			'hex',
		),
		Buffer.from(
			'339fd39a1929f18747b89ce2ee9f0c8e8d1b0f6b61a380e79301a6f93770a61a9a2870510bb317fcd477d57e8516bb7ea9e0ba22a2dd902f08dbce63c63bc7d7',
			'hex',
		),
		Buffer.from(
			'd4e9414e748d208296d80f64c8a8d6fb01d9fe17b93c59fa683bbb3b5feec82e85142500dd3540fdce4ab8d3e2d768abb53c284f8ad1fc77020f26f2707ab055',
			'hex',
		),
		Buffer.from(
			'8adbfc2da88207b88b18a4412a1f17535156d5c0c7d2678dc60e884490a05c7ff089cc596438069c73d81ba65a7ae3932c375d4a35041da873b0f8f9ba235150',
			'hex',
		),
		Buffer.from(
			'254d189743e032dc8eb3f144ff3e8a68993473f0a98775cd3c6c4c1108c5febfa529663fa4267b65b85b3a2ff7ae3debd1dcdc58ee7ed591a51da253a26f139d',
			'hex',
		),
		Buffer.from(
			'11e0e4ec0b42c4d6f00aeb8c99d4f5789b30284b008f135c082a6e0216a61ce48e75d12c4c636d3428debaca56e25b7766f6a2defa2737b085be9a98676b4c9c',
			'hex',
		),
		Buffer.from(
			'1b2f2ed578b50c7193dc5d1bc75fbd71524b8152ba538e06e8343a5a9379f4e2afcdff17a69c9c5d47f7c38713578eb74c441a5d656e14ee3e32fb2c7b04ff05',
			'hex',
		),
		Buffer.from(
			'42e0a76a67f95d88e81ffce5a37718029b4a14beaf8a22dc2463128668496a6bfd0a4b6b4b13a763d1ba4a1038cd3471570dd777088c444a94d66e5445b4e7e6',
			'hex',
		),
		Buffer.from(
			'46ffd403c97042657da30a37b263e90549bbb72925c79aeaf42ee12df88888874d4ddbceec3c217cf822708ddfaa96d76a6feb46750bd6c43d9ec5721a2aa185',
			'hex',
		),
		Buffer.from(
			'5aa6a290e9d49d3d7def1b560d64d8179214cbf2b5836b45b8f699ac62f40489661a7c204f03bbcbacc54ef636d5e0847acb36b6f84bc4d0e0d6dff7a9c6c46b',
			'hex',
		),
		Buffer.from(
			'2a42c9ce8012cd01d158c8af64470bb647ea3b9361096f5074bfc7e2db29210ad86fb3e4b411acd4b75d1f2960691f019dcc960eecb79b23a14d9142e853c516',
			'hex',
		),
		Buffer.from(
			'87776e14ff3e4e994047f693b936e1ebeec36491b47174cf9a7014276e1b75c28485184eb8a3838677155276a9ca800afc1d3a9091a03143722da3bbaf41b2da',
			'hex',
		),
		Buffer.from(
			'4018d0738454e693db76b840b10ee38414522454581f5920b657df1f0093cfc3076aeb322715f025573e6a070a4f99b8618e31f3990fafe4ed78762ffbbcd10d',
			'hex',
		),
		Buffer.from(
			'c37964cb9f9fb03ab4a8752b6901f5a770b3b24f96a4b80f53442d9b0657d93560821d5654f8831fa04581d604f80a5dba483d521dd71457b8099f15d5f3a9bd',
			'hex',
		),
		Buffer.from(
			'1606c663aa513213f6f0a7a3801cc94b426e2180df616e8759f68f87c65c8cf6eb3023fd03f12051ccd2ce1b1aeab59a12f790c45f49eff06cca4b31760fbc05',
			'hex',
		),
		Buffer.from(
			'f8fc1d2873498ca388b6c112da61af7a536150edd59ea806529e2938f913aa051702979f022a5080d629d516d92832f0cb1a5423e87e0c3e98dc08214c82a50d',
			'hex',
		),
		Buffer.from(
			'279e1a639e7818800ed3254d69accc3fd4b0af98cb787aa6e187d67428af583c3e160325bb9062f3bc6569a2f67a146d97b815c95932b9bf93b1bbfd310b05ab',
			'hex',
		),
		Buffer.from(
			'e2a5c3009c679d72b906272bcd23638467d14e3fe63d32779c4dcd59a560c6e9befa06df0884fefd43675438ef7b193bff169724fcbaaffe13abc68bc6eac3b8',
			'hex',
		),
		Buffer.from(
			'f3e206f0c8c7401d16e3dd7b93142443d75ed03daf7cc29c1c72675db6dcf3b4ba08c376dc169501561478cf5b31768d27ef5a83ff1fa8659516957470026e72',
			'hex',
		),
		Buffer.from(
			'0c9a00a2b34a0d09417c0e1bacb0b2faaa2e4ef73ff700f6c7417e859c1df029d8b5992a04e1f336361b3ae63af523544e596b0f7465ff28bc7de08da63833e1',
			'hex',
		),
		Buffer.from(
			'a58c7e915da617cad5b1ba6c1848a6306baa404de32f96e607302f4121d4e97fe9467bef991b7a9afce3a0315347182cc555f4b75127bf46154f894dd4e398f4',
			'hex',
		),
		Buffer.from(
			'3d3a436f93834b78a1fe6487fa45c4e51dd051a986be943b700d9fe49282438beb2e7aefe8e19161f84a1306acc0baa2107f6817f5c6bc261146dfc52f6b51fd',
			'hex',
		),
	],
};

const testSchema = {
	$id: 'testSchema',
	type: 'object',
	properties: {
		senderPublicKey: { fieldNumber: 1, dataType: 'bytes' },
		nonce: { fieldNumber: 2, dataType: 'uint32' },
		free: { fieldNumber: 3, dataType: 'uint64' },
		type: { fieldNumber: 4, dataType: 'uint32' },
		asset: {
			type: 'object',
			fieldNumber: 5,
			properties: {
				numberOfSignatures: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				mandatoryKeys: {
					fieldNumber: 2,
					type: 'array',
					items: {
						dataType: 'bytes',
					},
				},
				optionalKeys: {
					fieldNumber: 3,
					type: 'array',
					items: {
						dataType: 'bytes',
					},
				},
			},
		},
		signatures: {
			fieldNumber: 6,
			type: 'array',
			items: {
				dataType: 'bytes',
			},
		},
	},
};

const biggestMultisigTransactionRegistrationEncoded = codec.encode(
	testSchema,
	biggestMultisigTransactionRegistration,
);

suite
	.add('Encode biggest possible Lisk transaction', () => {
		codec.encode(testSchema, biggestMultisigTransactionRegistration);
	})
	.add('Decode biggest possible Lisk transaction', () => {
		codec.decode(testSchema, biggestMultisigTransactionRegistrationEncoded);
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.run({ async: false });
