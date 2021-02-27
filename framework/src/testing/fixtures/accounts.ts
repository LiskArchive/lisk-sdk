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
import { Account, AccountDefaultProps, getAccountSchemaWithDefault } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { ModuleClass } from '../types';
import { getAccountSchemaFromModules } from '../utils';

export const defaultAccountsAddresses = [
	'0903f4c5cb599a7928aef27e314e98291d1e3888',
	'0ada6a2f6c8f891769366fc9aa6fd9f1facb36cf',
	'0bc3bec2fdb565996fd316e368e66e5d8e830808',
	'0d2c377e936b68c70066613b10c0fdad537f90da',
	'0f33a5033b750e6c4dca47e38ba020e912df143e',
	'1ac73bff74924ad9b74236c4962be27174ae87d0',
	'1c194c2be1cc53f663a93c64899cbaa34016f415',
	'2159f75e5440c36431aedbc7dc29a65a327778b8',
	'246fba5c519576d93c5fac899c44b29b72f526ae',
	'24c130eb6cc0d8f663a8f6d16ffc61f935a2e02e',
	'27843a60a1e044c1e6e3cf119fdf64eb2b3e0d94',
	'290abc4a2244bf0ecf5aa1ccee8ac8f60f8bce48',
	'2cf52c08cc76091d884e800c1c697b13f69907d4',
	'308a95d1d3f7bb556f48da4f4344566e59f6f1cb',
	'31204ad5b95dd922c2899aa5bf8e7ee5b7546af3',
	'31fe789b43277e35ab410f2afcfb574280af2dd8',
	'328d0f546695c5fa02105deb055cf2801d9b8ba1',
	'3b3e137b1bec6f20c9a8b2ad4f5784661fb0fa79',
	'3b96d8565569421f43684b2c4eaa0639cbb5e011',
	'3c80e7d9964a1c83a6dd5dc64e105e0e634bd58a',
	'3de95e18f18a54e2269bbf8f1a38ea70762c73fa',
	'3deeb0a7426a028b435b4ddd8d35ac85cf567237',
	'436b40f58c0c27ed133f6001a019ff25561efad4',
	'463e7e879b7bdc6a97ec02a2a603aa1a46a04c80',
	'4b6126597881cb6ba1a45c1f6286769e7a094fb4',
	'4e874bcfb6f5896fe9e5dab3b26f59b2e2a9c09b',
	'4f4422eb61c45edb4d76f10cd871c9f983f2ebaa',
	'4fd52f67f151fbbdda9dd92a714884a399830eca',
	'4fd8cc4e27a3489b57ed986efe3d327d3de40d92',
	'52f9cdcff0605241c78278690ae36eb0136a30ff',
	'5853a3f24990deecced49d6bc15990102ec0c33a',
	'58d907d26508603e838423daa2061c29c7a84950',
	'5ade564399e670bd1d429583059067f3a6ca2b7f',
	'5cd1d0ccf98f2bd5a4bfaa770d55f16498af0bcc',
	'5fbd442a4647b079cda1229ecf6d8f44f361c8ca',
	'6174515fa66c91bff1128913edd4e0f1de37cee0',
	'61f396d2a4a13ab7a39ba791fac4b921b54a208e',
	'6330fd8ae91df4a5d7fbc2390c182ec6676dc5a6',
	'657f610728eef97d55e50212871f0993bb7cc700',
	'65f927187bf96aac5d968fcc9351e5492b5f9356',
	'6b9895c31bcdb2d9c929b9da7e389ed91de672a0',
	'6e12e4498ae69fb07ff2d8aab036a911229d6c62',
	'6ffcd8ad547d8a549a31b25236e322c781a52d85',
	'70abf056bd92e8f77cfc551748fa54a4e3018d5f',
	'79f30c1cbc1b9c4949c8b85acc24a7578e01558b',
	'7d2c6781d873ed2ba7a87f46f735f5e15a41a6f1',
	'7d60db187337cbd881140d69d84c9246eda8382e',
	'8074f0d02f748fc55448a4bf200f1dade8517059',
	'82cbc7b39d35af358f9e2513af13b2f77b647a00',
	'8459b8870fcefff59f172d716b7bfe9fcc28d408',
	'8506f3c10f75044946f1a23a7caf578253649471',
	'8722453383f781d5427a4ee211020e49bf34a2b9',
	'89b144ecfdd5ea352083bf624d3cf842ec06a5e3',
	'8ac800124d5b16afd57b5cf7245edfcd5885ea3b',
	'8b1c221a030cf720736d9fb7d0499dd7276fc1b3',
	'8eceffd5a41e678b6467c9bc80ce35d2e8543d98',
	'9139c91f8a0aa1fb385770feaf299b99883aec2d',
	'936f3a0f4d776b6a7722ed126e8ff17b44d7e7b8',
	'94146c9889748c7b727eb3ac8c20e53c52effd32',
	'9b42e4264020f3c3dcaaed806578ccd469205060',
	'9cabee3d27426676b852ce6b804cb2fdff7cd0b5',
	'9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
	'a0620472cde03e77caece701ab7bc5928a5d367c',
	'a0bc50b27e7ac39060ed015a55f2f4508c84f0c2',
	'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
	'a6f6a0543ae470c6b056021cb2ac153368eafeec',
	'a9c66694dd65b2fdf40cdf45a0c308cbd38004fc',
	'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
	'abd2ed5ad35b3a0870aadae6dceacc988ba63895',
	'acfbdbaeb93d587170c7cd9c0b5ffdeb7ff9daec',
	'ad42f8e867d618171bf4982e64269442148f6e11',
	'aebd99f07218109162a905d0e0c91e58bedc83c5',
	'b11c5811ea074a30142d824b6e8cfd3df14b2688',
	'b485becd88db1ab3d556d405204451ba00adaa7d',
	'b543e2e592200beb38235f6e48f8abe1d87ad872',
	'b56c55b9a70c8e2f07979b862374aed0e92a6dda',
	'b7580969dd56151f608931f126f793bbf45d8fa0',
	'b76a0f1819c4be0a1482567ca9b9fbed3eda444c',
	'bd175729d4177259c71cf13fd4ecfb5d01542706',
	'be89f4e983dfb04e2b58a12eb9ed18149e108b07',
	'c3ab2ac23512d9bf62b02775e22cf80df814eb1b',
	'c697b620c7c4015e32dd7bdd7d0430b33404e107',
	'c98554123062ac5795a3ee905b081e863db5a818',
	'ca309a5f4bbf11ca86592febb6d2ccc78309f69e',
	'ca5f6d76eab6e4f5aacee2864c79034d7111b986',
	'cb579ee537b34926d47129a0b54c0e6d00ef3004',
	'd06fe6d3e5f7facb5855eca839422fe3824a5d6e',
	'd0a0e45b950e3871d8783b973409042b4ab382d4',
	'd2c9a93755aed20c4d8f55c1e92b812d2c7d49d2',
	'd3c8064d011ef853e3be506b95a045f41f78e72a',
	'd5bd2050b74b309d54819ca17add173c6fca1e16',
	'd5c4e380b1ec2f7f2068cfba9a90cb3ae7816110',
	'd5e1f52cbe4a11a3730b98f52109b57602a9c4a1',
	'd8e611bafd70a549f035cf61ab0d6ed9e7f25c4e',
	'dcb5bf35b6d521195e613c42483f520139e2331d',
	'df0e187bb3895806261c87cf66e1772566ee8e58',
	'e2950a9f07b44e724df2129360cc140293c08308',
	'e39316cc020089ea7a5614bcf69a8931c10630a7',
	'e9355152c117c9e1fad8be86e9abea961cef4a36',
	'f730cb929a1c45032387c345e10d2427bea55a5e',
	'fa526a1611ccc66dec815cb963174118074b736e',
	'ffce8ce225c5d80098f50e877125b655aef6d101',
];

export const defaultDelegates = [
	{
		address: '03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f',
		dpos: {
			delegate: {
				username: 'delegate_1',
			},
		},
	},
];

export const createDefaultAccount = <T = AccountDefaultProps>(
	modules: ModuleClass[] = [],
	data: Record<string, unknown> = {},
): Account<T> => {
	const { default: defaultAccount } = getAccountSchemaWithDefault(
		getAccountSchemaFromModules(modules),
	);

	const account = objects.mergeDeep({}, defaultAccount, data) as Account<T>;
	account.address = account.address ?? getRandomBytes(20);

	return objects.cloneDeep(account);
};

export const defaultGenesisConfig = {
	address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
	publicKey: Buffer.from('0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a', 'hex'),
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};
