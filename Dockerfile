FROM node:alpine

WORKDIR /usr/app/

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod 0550 /usr/app/start

CMD ["/usr/app/start"]