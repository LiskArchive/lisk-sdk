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

INSERT INTO mem_accounts (
	"address", "publicKey", "secondPublicKey",
	"secondSignature",  "u_secondSignature",
	"username", "u_username",
	"isDelegate", "u_isDelegate",
	"balance", "u_balance",
	"delegates", "u_delegates",
	"missedBlocks", "producedBlocks",
	"rank", "fees", "rewards", "vote",
	"nameexist", "u_nameexist",
	"multimin", "u_multimin",
	"multilifetime", "u_multilifetime",
	"multisignatures", "u_multisignatures"
) VALUES (
	${address}, ${publicKey}, ${publicKey},
	${secondSignature}, ${u_secondSignature},
	${username}, ${u_username},
	${isDelegate}, ${u_isDelegate},
	${balance}, ${u_balance},
	${delegates}, ${u_delegates},
	${missedBlocks}, ${producedBlocks},
	${rank}, ${fees}, ${rewards}, ${vote},
	${nameExist}, ${u_nameExist},
	${multiMin}, ${u_multiMin},
	${multiLifetime}, ${u_multiLifetime},
	${multiSignatures}, ${u_multiSignatures}
);
