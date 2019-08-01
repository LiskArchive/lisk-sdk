/*
 * Copyright © 2019 Lisk Foundation
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


/*
  DESCRIPTION: Adds indexes for trs table.

  PARAMETERS: None
*/

-- Drop actual indexes that are no longer needed (new indexes covers them)
DROP INDEX trs_type;
DROP INDEX trs_timestamp;

-- Add indexes for improve sorting by timestamp
CREATE INDEX trs_timestamp_asc_row_id_asc ON trs (timestamp ASC, "rowId" ASC);
CREATE INDEX trs_timestamp_desc_row_id_asc ON trs (timestamp DESC, "rowId" ASC);

-- Add indexes for improve sorting by amount
CREATE INDEX trs_amount_asc_row_id_asc ON trs (amount ASC, "rowId" ASC);
CREATE INDEX trs_amount_desc_row_id_asc ON trs (amount DESC, "rowId" ASC);

-- Add indexes for improve sorting by fee
CREATE INDEX trs_fee_asc_row_id_asc ON trs (fee ASC, "rowId" ASC);
CREATE INDEX trs_fee_desc_row_id_asc ON trs (fee DESC, "rowId" ASC);

-- Add indexes for improve sorting by type
CREATE INDEX trs_type_asc_row_id_asc ON trs (type ASC, "rowId" ASC);
CREATE INDEX trs_type_desc_row_id_asc ON trs (type DESC, "rowId" ASC);
