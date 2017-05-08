/*
 * Create function for generating delegates list
 */

BEGIN;

-- Enable crypto extension
CREATE EXTENSION pgcrypto;

-- Create function that generate delegates list
-- @IMMUTABLE - always returns the same result
CREATE OR REPLACE FUNCTION generateDelegatesList(round int, delegates text[]) RETURNS text[] LANGUAGE PLPGSQL IMMUTABLE AS $$
DECLARE
  i int;
  x int;
  n int;
  old text;
  hash bytea;
  len int;
BEGIN
  -- Check if arguments are valid
  IF round IS NULL OR round < 1 OR delegates IS NULL OR array_length(delegates, 1) IS NULL OR array_length(delegates, 1) < 1 THEN
    RAISE invalid_parameter_value USING MESSAGE = 'Invalid parameters supplied';
  END IF;

  -- Create hash from round
  hash := digest(round::text, 'sha256');
  len := array_length(delegates, 1);

  i := 0;
  LOOP
    EXIT WHEN i >= 101;
    x := 0;
    LOOP
      EXIT WHEN x >= 4 OR i >= len;
      -- Calculate index to swap at
      n := get_byte(hash, x) % len;
      -- Copy delegate before overwrite
      old := delegates[n+1];
      -- Swap delegates at index n with delegate at index i
      delegates[n+1] = delegates[i+1];
      delegates[i+1] = old;
      -- Increment iterators
      i := i + 1;
      x := x + 1;
    END LOOP;
    -- Calculate next hash
    hash := digest(hash, 'sha256');
    -- Increment iterator
    i := i + 1;
  END LOOP;

  -- Return generated delagets list
  RETURN delegates;
END $$;

COMMIT;
