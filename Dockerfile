FROM node:lts-alpine

WORKDIR /usr/app/

COPY package*.json ./
COPY dist ./
COPY start.sh ./

RUN npm install --production

RUN chmod 0550 /usr/app/start.sh

CMD ["/usr/app/start.sh"]