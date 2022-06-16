FROM node:alpine

WORKDIR /usr/app/

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "supervisor.js"]

# run from root directoy with
# docker build -t localhost:32000/tmi-cluster:latest -f example/k8s/Dockerfile .