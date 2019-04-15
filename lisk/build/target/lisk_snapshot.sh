#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
#
# LiskHQ/lisk-scripts/lisk_snaphot.sh
# Copyright (C) 2017 Lisk Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#######################################################################

# It is you responsibility to ensure that this script does not get
# started more that once at a time; this can be achieved with e.g.:
# ~> flock --exclusive --nonblock lisk_snapshot.lock ./lisk_snapshot.sh
# TODO: delete old snapshots?

cd "$( cd -P -- "$(dirname -- "$0")" && pwd -P )" || exit 2
# shellcheck source=env.sh
source "$( pwd )/env.sh"
# shellcheck source=shared.sh
source "$( pwd )/shared.sh"

OUTPUT_DIRECTORY="$PWD/backups"
SOURCE_DATABASE=$( get_config '.db.database' )

mkdir -p "$OUTPUT_DIRECTORY"

function cleanup() {
	dropdb --if-exists lisk_snapshot 2>/dev/null
	bash lisk.sh start_node >/dev/null
	rm -f "$TEMP_FILE"
}

TEMP_FILE=$( mktemp --tmpdir="$OUTPUT_DIRECTORY" )
trap cleanup INT QUIT TERM EXIT

dropdb --if-exists lisk_snapshot 2>/dev/null
bash lisk.sh stop_node >/dev/null
createdb --template="$SOURCE_DATABASE" lisk_snapshot
bash lisk.sh start_node >/dev/null

# The dump file produced by pg_dump does not contain the statistics used by the optimizer to make query planning decisions.
#vacuumdb --analyze --full lisk_snapshot
psql --dbname=lisk_snapshot --command='TRUNCATE peers, mem_accounts2u_delegates, mem_accounts2u_multisignatures;' >/dev/null

HEIGHT=$( psql --dbname=lisk_snapshot --tuples-only --command='SELECT height FROM blocks ORDER BY height DESC LIMIT 1;' |xargs)
OUTPUT_FILE="${OUTPUT_DIRECTORY}/${SOURCE_DATABASE}_backup-${HEIGHT}.gz"

pg_dump --no-owner lisk_snapshot |gzip -9 >"$TEMP_FILE"
mv "$TEMP_FILE" "$OUTPUT_FILE"
