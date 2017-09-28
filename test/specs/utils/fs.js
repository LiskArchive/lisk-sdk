/*
 * LiskHQ/lisky
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
import {
	givenThereIsAFileWithUtf8EncodedJSONContentsAtPath,
	givenTheFileHasABOM,
	givenThereIsAnObjectThatShouldBeWrittenToPath,
} from '../../steps/1_given';
import {
	whenTheJSONIsRead,
	whenTheJSONIsWritten,
} from '../../steps/2_when';
import {
	thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding,
	thenJSONParseShouldBeCalledWithTheFileContentsAsAString,
	thenJSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM,
	thenTheParsedFileContentsShouldBeReturned,
	thenJSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation,
	thenFsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON,
} from '../../steps/3_then';

describe('fs module', () => {
	describe('#readJsonSync', () => {
		describe('Given there is a file with utf8-encoded JSON contents at path "/some/path/to/file.json"', () => {
			beforeEach(givenThereIsAFileWithUtf8EncodedJSONContentsAtPath);

			describe('When the JSON is read', () => {
				beforeEach(whenTheJSONIsRead);

				it('Then fs.readFileSync should be called with the path and encoding', thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding);
				it('Then JSON.parse should be called with the file contents as a string', thenJSONParseShouldBeCalledWithTheFileContentsAsAString);
				it('Then the parsed file contents should be returned', thenTheParsedFileContentsShouldBeReturned);
			});

			describe('Given the file has a BOM', () => {
				beforeEach(givenTheFileHasABOM);

				describe('When the JSON is read', () => {
					beforeEach(whenTheJSONIsRead);

					it('Then fs.readFileSync should be called with the path and encoding', thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding);
					it('Then JSON.parse should be called with the file contents as a string without the BOM', thenJSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM);
					it('Then the parsed file contents should be returned', thenTheParsedFileContentsShouldBeReturned);
				});
			});
		});
	});

	describe('#writeJsonSync', () => {
		describe('Given there is an object that should be written to path "/some/path/to/file.json"', () => {
			beforeEach(givenThereIsAnObjectThatShouldBeWrittenToPath);

			describe('When the JSON is written', () => {
				beforeEach(whenTheJSONIsWritten);

				it('Then JSON.stringify should be called with the object using tab indentation', thenJSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation);
				it('Then fs.writeFileSync should be called with the path and the stringified JSON', thenFsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON);
			});
		});
	});
});
