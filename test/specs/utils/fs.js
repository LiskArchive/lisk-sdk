/*
 * LiskHQ/lisk-commander
 * Copyright © 2017 Lisk Foundation
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
import { setUpUtilFs } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('fs module', () => {
	beforeEach(setUpUtilFs);
	describe('#readJSONSync', () => {
		Given(
			'there is a file with utf8-encoded JSON contents at path "/some/path/to/file.json"',
			given.thereIsAFileWithUtf8EncodedJSONContentsAtPath,
			() => {
				When('the JSON is read', when.theJSONIsRead, () => {
					Then(
						'fs.readFileSync should be called with the path and encoding',
						then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding,
					);
					Then(
						'JSON.parse should be called with the file contents as a string',
						then.jsonParseShouldBeCalledWithTheFileContentsAsAString,
					);
					Then(
						'the parsed file contents should be returned',
						then.theParsedFileContentsShouldBeReturned,
					);
				});
				Given('the file has a BOM', given.theFileHasABOM, () => {
					When('the JSON is read', when.theJSONIsRead, () => {
						Then(
							'fs.readFileSync should be called with the path and encoding',
							then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding,
						);
						Then(
							'JSON.parse should be called with the file contents as a string without the BOM',
							then.jsonParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM,
						);
						Then(
							'the parsed file contents should be returned',
							then.theParsedFileContentsShouldBeReturned,
						);
					});
				});
			},
		);
	});
	describe('#writeJSONSync', () => {
		Given(
			'there is an object that should be written to path "/some/path/to/file.json"',
			given.thereIsAnObjectThatShouldBeWrittenToPath,
			() => {
				When('the JSON is written', when.theJSONIsWritten, () => {
					Then(
						'JSON.stringify should be called with the object using tab indentation',
						then.jsonStringifyShouldBeCalledWithTheObjectUsingTabIndentation,
					);
					Then(
						'fs.writeFileSync should be called with the path and the stringified JSON',
						then.fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON,
					);
				});
			},
		);
	});
});
