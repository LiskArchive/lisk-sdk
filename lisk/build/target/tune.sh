#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
#
# LiskHQ/lisk-scripts/packaged/tune.sh
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
######################################################################

######################################################################
# Postgres Memory Tuning for Lisk                                    #
# Author: Isabella Dell                                              #
# Date: 16/05/2016                                                   #
######################################################################

MEMORY_BASE=$( grep MemTotal /proc/meminfo | awk '{print $2 }' | cut -f1 -d . )

if [[ "$MEMORY_BASE" -lt "1310720" ]]; then
	echo "Not enough ram, taking defaults."
	exit 0
fi

# Hard code memory limit for systems above 16G
if [[ "$MEMORY_BASE" -gt 16777216 ]]; then
	MEMORY_BASE=16777216
fi

max_connections=200

cat << EOD >>pgsql/data/postgresql.conf

# added by tune.sh

max_connections = $max_connections
shared_buffers = $(( MEMORY_BASE / 4))kB
work_mem = $(( (MEMORY_BASE - ( MEMORY_BASE / 4 ))/ (max_connections * 3  )))kB
maintenance_work_mem = $(( MEMORY_BASE / 16 ))kB
synchronous_commit = off
wal_buffers = 16MB
max_wal_size = 2GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
effective_cache_size = $(( MEMORY_BASE  / 4))kB
default_statistics_target = 100
log_line_prefix = '%t '
EOD
