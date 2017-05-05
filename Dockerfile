FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/lisk
WORKDIR /usr/src/lisk

# Install lisk dependencies
COPY package.json /usr/src/lisk/
RUN npm install

# Bundle lisk source
COPY . /usr/src/lisk

EXPOSE 8080
CMD [ "npm", "start" ]
