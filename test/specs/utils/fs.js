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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('fs module', () => {
	describe('#readJsonSync', () => {
		describe('Given there is a file with utf8-encoded JSON contents at path "/some/path/to/file.json"', () => {
			beforeEach(given.thereIsAFileWithUtf8EncodedJSONContentsAtPath);

			describe('When the JSON is read', () => {
				beforeEach(when.theJSONIsRead);

				it('Then fs.readFileSync should be called with the path and encoding', then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding);
				it('Then JSON.parse should be called with the file contents as a string', then.jSONParseShouldBeCalledWithTheFileContentsAsAString);
				it('Then the parsed file contents should be returned', then.theParsedFileContentsShouldBeReturned);
			});

			describe('Given the file has a BOM', () => {
				beforeEach(given.theFileHasABOM);

				describe('When the JSON is read', () => {
					beforeEach(when.theJSONIsRead);

					it('Then fs.readFileSync should be called with the path and encoding', then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding);
					it('Then JSON.parse should be called with the file contents as a string without the BOM', then.jSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM);
					it('Then the parsed file contents should be returned', then.theParsedFileContentsShouldBeReturned);
				});
			});
		});
	});

	describe('#writeJsonSync', () => {
		describe('Given there is an object that should be written to path "/some/path/to/file.json"', () => {
			beforeEach(given.thereIsAnObjectThatShouldBeWrittenToPath);

			describe('When the JSON is written', () => {
				beforeEach(when.theJSONIsWritten);

				it('Then JSON.stringify should be called with the object using tab indentation', then.jSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation);
				it('Then fs.writeFileSync should be called with the path and the stringified JSON', then.fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON);
			});
		});
	});
});
