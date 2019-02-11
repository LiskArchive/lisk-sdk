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


/*
  DESCRIPTION: 

  PARAMETERS: None
*/

DROP FUNCTION IF EXISTS binary_replace(bytea, bytea, bytea);

-- Look for 's1' bytes into a BYTEA field (str) and replace them with provided 's2' byte
CREATE FUNCTION binary_replace(str bytea, s1 bytea, s2 bytea)
	RETURNS bytea AS $$
	DECLARE
	 i int:=position(s1 IN str);
	 j int;
	 l1 int:=LENGTH(s1);
	 l2 int:=LENGTH(s2);
	BEGIN
	  WHILE (i>0) LOOP
	    str:=overlay(str placing s2 FROM i FOR l1);
	    j:=position(s1 IN substring(str FROM i+l2));
	    IF (j>0) THEN
	      i:=i+j-1+l2;
	    ELSE
	      i:=0;
	    END IF;
	  END LOOP;
	  RETURN str;
	END
	$$ language plpgsql immutable;

UPDATE transfer
SET data = binary_replace(data, '\x00', ''::bytea)
WHERE position('\x00' in data) > 0;

DROP FUNCTION IF EXISTS binary_replace(bytea, bytea, bytea);
