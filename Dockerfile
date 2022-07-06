FROM node:alpine

WORKDIR /usr/app/

COPY package*.json ./

RUN npm install --production

COPY . .

RUN chmod 0550 /usr/app/start.sh

CMD ["/usr/app/start.sh"]