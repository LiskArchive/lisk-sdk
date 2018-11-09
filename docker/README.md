# Using docker-compose

## Copy sample .env file

Choose one of the sample `.env.*` file and copy it to `.env` and modify it to suit your needs (you will likely want to set the version number at least).

## Run docker-compose

You can run docker-compose directly or use the `Makefile` (you will need to install `make`) for convenience:

```
make
make coldstart
docker-compose logs
```
