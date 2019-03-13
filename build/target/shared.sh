#!/bin/bash
#
# LiskHQ/lisk-scripts/shared.sh
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

function get_lisk_app_name() {
	local PM2_CONFIG=$1
	PM2_APP="$( jq .apps[0].name -r "$PM2_CONFIG" )"
	echo "$PM2_APP"
}

function get_lisk_custom_config() {
	local PM2_CONFIG=$1
	local REGEXP="-c ([^ ]+)"
	PM2_APP_ARGS="$( jq .apps[0].args -r "$PM2_CONFIG" )"
	if [[ "$PM2_APP_ARGS" =~ $REGEXP ]]; then
		LISK_CUSTOM_CONFIG="${BASH_REMATCH[1]}"
	else
		LISK_CUSTOM_CONFIG=/dev/null
	fi
	echo "$LISK_CUSTOM_CONFIG"
}

# Default value of LISK_CUSTOM_CONFIG
LISK_CUSTOM_CONFIG=$( get_lisk_custom_config "$LISK_PATH/etc/pm2-lisk.json" )

function get_config() {
# use first of: custom configuration file, network configuration file or default configuration file
	local KEY=$1
	VALUE=$( jq --raw-output "$KEY" "$LISK_CUSTOM_CONFIG" )
	if [ -z "$VALUE" ] || [ "$VALUE" = "null" ]; then
		VALUE=$( jq --raw-output "$KEY" "$(pwd)/config/$LISK_NETWORK/config.json" )
	fi
	if [ -z "$VALUE" ] || [ "$VALUE" = "null" ]; then
		VALUE=$( jq --raw-output "$KEY" "$(pwd)/config/default/config.json" )
	fi
	echo "$VALUE"
}
