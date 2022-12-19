/*
 * Copyright © 2022 Lisk Foundation
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

import { ActiveValidator, LastCertificate } from "lisk-sdk";
import { BlockHeader, ValidatorsData } from "./types";
import { getActiveValidatorsDiff } from "./utils";

export const calculateActiveValidatorsUpdate = (
  blockHeader: BlockHeader,
  validatorsHashPreimages: ValidatorsData[],
  lastCertificate: LastCertificate,
  ) => {
    let activeBFTValidatorsUpdate: ActiveValidator[];
		let activeValidatorsUpdate: ActiveValidator[] = [];
    let certificateThreshold = BigInt(0);
    const validatorDataAtCertificate = validatorsHashPreimages.find(data =>
      data.validatorsHash.equals(blockHeader.validatorsHash),
    );

    if (!validatorDataAtCertificate) {
      throw new Error('No validators data at certificate height.');
    }

    const validatorDataAtLastCertificate = validatorsHashPreimages.find(data =>
      data.validatorsHash.equals(lastCertificate.validatorsHash),
    );

    if (!validatorDataAtLastCertificate) {
      throw new Error('No validators data at last certified height.');
    }

    // if the certificate threshold is not changed from last certificate then we assign zero
    if (
      validatorDataAtCertificate.certificateThreshold ===
      validatorDataAtLastCertificate.certificateThreshold
    ) {
      certificateThreshold = BigInt(0);
    } else {
      certificateThreshold = validatorDataAtCertificate.certificateThreshold;
    }

    activeBFTValidatorsUpdate = getActiveValidatorsDiff(
      validatorDataAtLastCertificate.validators,
      validatorDataAtCertificate.validators,
    );

    activeValidatorsUpdate = activeBFTValidatorsUpdate.map(
      validator =>
        ({
          blsKey: validator.blsKey,
          bftWeight: validator.bftWeight,
        } as ActiveValidator),
    );

    return { activeValidatorsUpdate, certificateThreshold };
}