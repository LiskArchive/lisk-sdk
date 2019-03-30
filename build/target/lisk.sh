#!/bin/bash
#
# LiskHQ/lisk-scripts/lisk.sh
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

# shellcheck disable=SC2129

cd "$( cd -P -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd -P )" || exit 2

if [ ! -f "$PWD/.build" ]; then
	echo "Error: Lisk installation was not found. Exiting."
	exit 1
fi

if [ "$UID" == 0 ]; then
	echo "Error: Lisk should not be run be as root. Exiting."
	exit 1
fi

# shellcheck source=env.sh
. "$PWD/env.sh"
# shellcheck source=shared.sh
. "$PWD/shared.sh"

PM2_CONFIG="$PWD/etc/pm2-lisk.json"
PM2_APP=$( get_lisk_app_name "$PM2_CONFIG" )

LISK_LOGS=$( get_config '.logFileName' )

LOGS_DIR="$PWD/logs"

MINIMAL_DB_SNAPSHOT="$(pwd)/var/db/blockchain.db.gz"
# Allocates variables for use later, reusable for changing pm2 config.
config() {
	DB_NAME=$( get_config '.db.database' )
	DB_PORT=$( get_config '.db.port' )
	DB_USER=$( get_config '.db.user' )
	DB_PASS=$( get_config '.db.password' )
	DB_DATA="$PWD/pgsql/data"
	DB_LOG_FILE="$LOGS_DIR/pgsql.log"
	DB_SNAPSHOT="blockchain.db.gz"
	DB_DOWNLOAD=Y

	REDIS_CONFIG="$PWD/etc/redis.conf"
	REDIS_BIN="$PWD/bin/redis-server"
	REDIS_CLI="$PWD/bin/redis-cli"
	REDIS_ENABLED=$( get_config '.cacheEnabled' )
	REDIS_PORT=$( get_config '.redis.port' )
	REDIS_PASSWORD=$( get_config '.redis.password' )
	REDIS_PID="$PWD/redis/redis_6380.pid"
}

# Sets all of the variables
config

# Setup logging
SH_LOG_FILE="$LOGS_DIR/lisk.out"
exec > >(tee -ia "$SH_LOG_FILE")
exec 2>&1

################################################################################

blockheight() {
	DB_HEIGHT="$(psql -d "$DB_NAME" -t -p "$DB_PORT" -c 'select height from blocks order by height desc limit 1;')"
	HEIGHT="${DB_HEIGHT:- Unavailable}"
	echo -e "Current Block Height:" "$HEIGHT"
}

network() {
	NETWORK=${LISK_NETWORK%net}
	echo "Lisk configured for $LISK_NETWORK" |tee -a "$SH_LOG_FILE"
}

create_user() {
	dropuser --if-exists "$DB_USER" >> "$SH_LOG_FILE" 2>&1
	createuser --createdb "$DB_USER" >> "$SH_LOG_FILE" 2>&1
	if ! psql -qd postgres -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" >> "$SH_LOG_FILE" 2>&1; then
		echo "[-] Failed to create Postgresql user."
		exit 1
	else
		echo "[+] Postgresql user created successfully."
	fi
}

create_database() {
	dropdb --if-exists "$DB_NAME" >> "$SH_LOG_FILE" 2>&1

	if ! createdb "$DB_NAME" >> "$SH_LOG_FILE" 2>&1; then
		echo "[-] Failed to create Postgresql database."
		exit 1
	else
		echo "[+] Postgresql database created successfully."
	fi
}

populate_database() {
	if ! psql -ltAq | grep -q "^$DB_NAME|" >> "$SH_LOG_FILE" 2>&1; then
		echo "Could not find database $DB_NAME."
		exit 1
	fi
	frobnicate
	download_blockchain
	restore_blockchain
}

frobnicate() {
	# if not custom URL has been passed, use downloads.lisk.io
	if [ -z "$BLOCKCHAIN_URL" ]; then
		# skip downloading anything for non-public networks
		if [ "$NETWORK" != "main" ] && [ "$NETWORK" != "test" ] && [ "$NETWORK" != "beta" ]; then
			DB_SNAPSHOT="$MINIMAL_DB_SNAPSHOT"
			DB_DOWNLOAD="N"
		else
			BLOCKCHAIN_URL="https://downloads.lisk.io/lisk/$NETWORK"
		fi
	fi
}

download_blockchain() {
	if [ "$DB_DOWNLOAD" = "N" ]; then
		return
	fi
	rm -f "$DB_SNAPSHOT"
	echo "[+] Downloading $DB_SNAPSHOT from $BLOCKCHAIN_URL"
	if ! curl --fail --progress-bar -o "$DB_SNAPSHOT" "$BLOCKCHAIN_URL/$DB_SNAPSHOT"; then
		rm -f "$DB_SNAPSHOT"
		echo "[-] Failed to download blockchain snapshot."
		exit 1
	else
		# Required to clean up ugly curl output in the logs
		sed -i -e '/[#]/d' "$SH_LOG_FILE"
		echo "[+] Blockchain snapshot downloaded successfully."
	fi
}

restore_blockchain() {
	echo 'Restoring blockchain with '"$DB_SNAPSHOT"

	set -o pipefail
	if ! gunzip -fcq "$DB_SNAPSHOT" | psql -q -U "$DB_USER" -d "$DB_NAME" >> "$SH_LOG_FILE" 2>&1; then
		echo "[-] Failed to restore blockchain."
		exit 1
	else
		echo "[+] Blockchain restored successfully."
	fi
	set +o pipefail
}

autostart_cron() {
	local cmd="crontab"

	if ! command -v "$cmd" > /dev/null 2>&1; then
		echo "[-] Failed to execute crontab."
		return 1
	fi

	crontab=$($cmd -l 2> /dev/null | sed '/lisk\.sh start/d' 2> /dev/null)

	crontab=$(cat <<-EOF
		$crontab
		@reboot $(command -v "bash") $PWD/lisk.sh start > $PWD/cron.log 2>&1
EOF
	)

	if ! printf "%s\\n" "$crontab" | $cmd - >> "$SH_LOG_FILE" 2>&1; then
		echo "[-] Failed to update crontab."
		return 1
	else
		echo "[+] Crontab updated successfully."
		return 0
	fi
}

coldstart_lisk() {
	stop_lisk >> "$SH_LOG_FILE" 2>&1
	stop_postgresql >> "$SH_LOG_FILE" 2>&1
	rm -rf "$DB_DATA"
	pg_ctl initdb -D "$DB_DATA" >> "$SH_LOG_FILE" 2>&1
	sleep 2
	start_postgresql
	sleep 1
	create_user
	create_database
	populate_database
	autostart_cron
	start_lisk
}

start_postgresql() {
	if pg_ctl --pgdata="$DB_DATA" status >> "$SH_LOG_FILE" 2>&1; then
		echo "[+] Postgresql is running."
	else
		if pg_ctl --wait --pgdata="$DB_DATA" --log="$DB_LOG_FILE" start >> "$SH_LOG_FILE" 2>&1; then
			echo "[+] Postgresql started successfully."
		else
			echo "[-] Failed to start Postgresql."
			exit 1
		fi
	fi
}

stop_postgresql() {
	if pg_ctl --pgdata="$DB_DATA" status >> "$SH_LOG_FILE" 2>&1; then
		if pg_ctl --wait --pgdata="$DB_DATA" --log="$DB_LOG_FILE" stop >> "$SH_LOG_FILE" 2>&1; then
			echo "[+] Postgresql stopped successfully."
		else
			echo "[-] Postgresql failed to stop."
		fi
	else
		echo "[+] Postgresql is not running."
	fi
}

start_redis() {
	if [[ "$REDIS_ENABLED" == 'true' ]]; then
		if [[ "$REDIS_PORT" == '6379' ]]; then
			echo "[+] Using OS Redis-Server, skipping startup"
		elif [[ ! -f "$REDIS_PID" ]]; then

			if "$REDIS_BIN" "$REDIS_CONFIG"; then
				echo "[+] Redis-Server started successfully."
			else
				echo "[-] Failed to start Redis-Server."
				exit 1
			fi
		else
			echo "[+] Redis-Server is already running"
		fi
	fi
}

stop_redis() {
	if [[ "$REDIS_ENABLED" == 'true' ]]; then
		if [[ "$REDIS_PORT" == '6379' ]]; then
			echo "[+] OS Redis-Server detected, skipping shutdown"
		elif [[ -f "$REDIS_PID" ]]; then

			if stop_redis_cmd; then
				echo "[+] Redis-Server stopped successfully."
			else
				echo "[-] Failed to stop Redis-Server."
				REDIS_PID="$(tail -n1 "$REDIS_PID")"
				pkill -9 "$REDIS_PID"
				echo "[+] Redis-Server killed"
			fi
		else
			echo "[+] Redis-Server already stopped"
		fi
	fi
}

stop_redis_cmd(){
	# Necessary to pass the right password string to redis
	if [[ "$REDIS_PASSWORD" != null ]]; then
		"$REDIS_CLI" -p "$REDIS_PORT" "-a $REDIS_PASSWORD" shutdown
	else
		"$REDIS_CLI" -p "$REDIS_PORT" shutdown
	fi
}

start_lisk() {
	start_redis
	set_logs_paths
	if pm2 start "$PM2_CONFIG"  >> "$SH_LOG_FILE"; then
		echo "[+] Lisk started successfully."
		sleep 3
		check_status
	else
		echo "[-] Failed to start Lisk."
	fi
}

set_logs_paths() {
	mkdir -p "$(pwd)/logs/$LISK_NETWORK"
	TEMP=$( mktemp )
	jq '.apps[0].out_file = "logs/'"$LISK_NETWORK"'/lisk.app.log"|.apps[0].error_file = "logs/'"$LISK_NETWORK"'/lisk.app.err"' "$PM2_CONFIG" >"$TEMP"
	mv -f "$TEMP" "$PM2_CONFIG"
}

stop_lisk() {
	get_status
	pm2 delete "$PM2_CONFIG" >> "$SH_LOG_FILE"
	if [ "$STATUS" -eq 0 ] ; then
		echo "[+] Lisk stopped successfully."
	else
		echo "[+] Lisk is not running"
	fi
	stop_redis
}

reload_lisk() {
	echo "Stopping Lisk to reload PM2 config"
	stop_lisk
	start_lisk
}

rebuild_lisk() {
	create_database
	frobnicate
	download_blockchain
	restore_blockchain
}

pm2_cleanup() {
	pm2 delete all
	pm2 kill
}

get_status() {
	PM2_PID="$( pm2 --silent jlist | jq --raw-output ".[] | select(.name == \"$PM2_APP\").pm2_env.pm_pid_path" )"

	if [ -n "$PM2_PID" ]; then
		pm2 describe "$PM2_APP" >> "$SH_LOG_FILE"
		check_pid
	else
		STATUS=1
	fi
}

check_status() {
	get_status
	if [ "$STATUS" -eq 0  ]; then
		echo "[+] Lisk is running as PID: $PID"
		blockheight
	else
		echo "[-] Lisk is not running"
		exit 1
	fi
}

check_pid() {
	if [ -f "$PM2_PID" ]; then
	read -r PID < "$PM2_PID" 2>&1 > /dev/null
	fi
	if [ ! -z "$PID" ]; then
		ps -p "$PID" > /dev/null 2>&1
		STATUS=$?
	else
		STATUS=1
	fi
}

lisk() {
	node "$PWD/bin/lisk"
}

tail_logs() {
	tail -f "$LISK_LOGS"
}

help() {
	echo -e "\\nCommand Options for Lisk.sh"
	echo -e "\\nAll options may be passed [-p <PM2-config.json>]"
	echo -e "\\nstart_node                         Starts a Nodejs process for Lisk"
	echo -e "start                                 Starts the Nodejs process and PostgreSQL Database for Lisk"
	echo -e "stop_node                             Stops a Nodejs process for Lisk"
	echo -e "stop                                  Stop the Nodejs process and PostgreSQL Database for Lisk"
	echo -e "reload                                Restarts the Nodejs process for Lisk"
	echo -e "rebuild [-u URL] [-f file.db.gz] [-0] Rebuilds the PostgreSQL database"
	echo -e "start_db                              Starts the PostgreSQL database"
	echo -e "stop_db                               Stops the PostgreSQL database"
	echo -e "coldstart                             Creates the PostgreSQL database and configures config.json for Lisk"
	echo -e "lisk                                  Launches Lisk-commander"
	echo -e "logs                                  Displays and tails logs for Lisk"
	echo -e "status                                Displays the status of the PID associated with Lisk"
	echo -e "help                                  Displays this message"
}

parse_option() {
	OPTIND=2
	while getopts ":p:f:u:l:0" OPT; do
		case "$OPT" in
			p)
				if [ -f "$OPTARG" ]; then
					PM2_CONFIG="$OPTARG"
					PM2_APP=$( get_lisk_app_name "$PM2_CONFIG" )
					LISK_CUSTOM_CONFIG=$( get_lisk_custom_config "$PM2_CONFIG" )
					# Resets all of the variables
					config
				else
					echo "PM2-config.json not found. Please verify the file exists and try again."
					exit 1
				fi ;;

			u)
				BLOCKCHAIN_URL="$OPTARG"
				;;

			f)
				DB_SNAPSHOT="$OPTARG"
				if [ -f "$OPTARG" ]; then
					DB_DOWNLOAD=N
				fi ;;

			0)
				DB_SNAPSHOT="$MINIMAL_DB_SNAPSHOT"
				DB_DOWNLOAD=N
				;;

			:) echo 'Missing option argument for -'"$OPTARG" >&2; exit 1;;

			*) echo 'Unimplemented option: -'"$OPTARG" >&2; exit 1;;
		esac
	done
}

parse_option "$@"
network

case $1 in
"coldstart")
	coldstart_lisk
	;;
"start_node")
	start_lisk
	;;
"start")
	start_postgresql
	sleep 2
	start_lisk
	;;
"stop_node")
	stop_lisk
	;;
"stop")
	stop_lisk
	stop_postgresql
	;;
"reload")
	reload_lisk
	;;
"rebuild")
	stop_lisk
	sleep 1
	start_postgresql
	sleep 1
	rebuild_lisk
	start_lisk
	;;
"start_db")
	start_postgresql
	;;
"stop_db")
	stop_postgresql
	;;
"cleanup")
	pm2_cleanup
	;;
"status")
	check_status
	;;
"logs")
	tail_logs
	;;
"lisky")
	lisky
	;;
"help")
	help
	;;
*)
	echo "Error: Unrecognized command."
	echo ""
	echo "Available commands are: start stop start_node stop_node start_db stop_db reload rebuild coldstart logs lisky status help"
	help
	;;
esac

# Required to clean up colour characters that don't translate well from tee
sed -i -r 's/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]//g' "$SH_LOG_FILE"
