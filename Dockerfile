FROM node:12.18.1
 
WORKDIR /app
 
COPY package.json package.json
COPY package-lock.json package-lock.json
 
RUN npm install
RUN npm run build 
COPY . .
 
CMD [ "npm", "start" ]

EXPOSE 1337
