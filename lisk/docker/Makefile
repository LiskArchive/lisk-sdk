.PHONY: clean coldstart mrproper up
all: up

lisk_net := $(shell grep ^ENV_LISK_NETWORK= .env |tail -n 1 |awk -F = '{ gsub("net$$", ""); print $$2 }')
ifeq ($(lisk_net),)
$(error .env file does not exist or ENV_LISK_NETWORK variable is not set.)
endif
lisk_db := $(shell grep ^ENV_LISK_DB_DATABASE= .env |tail -n 1 |awk -F = '{ gsub("net$$", ""); print $$2 }')
ifeq ($(lisk_net),)
$(error .env file does not exist or ENV_LISK_DB_DATABASE variable is not set.)
endif

%blockchain.db.gz:
ifeq ($(lisk_net),$(filter $(lisk_net),main test))
	curl --output $(lisk_net)_blockchain.db.gz https://downloads.lisk.io/lisk/$(lisk_net)/blockchain.db.gz
else
	touch $(lisk_net)_blockchain.db
	gzip $(lisk_net)_blockchain.db
endif

up:
	docker-compose up --detach

compose := docker-compose -f docker-compose.yml -f docker-compose.make.yml
coldstart: $(lisk_net)_blockchain.db.gz up
	docker-compose stop lisk
	docker-compose start db
	$(compose) run --rm db-task dropdb --if-exists $(lisk_db)
	$(compose) run --rm db-task createdb $(lisk_db)
	gzip --decompress --to-stdout $(lisk_net)_blockchain.db.gz |$(compose) run --rm db-task psql >/dev/null
	docker-compose start lisk

clean:
	rm -f *blockchain.db.gz

mrproper: clean
	docker-compose down --volumes --remove-orphans
