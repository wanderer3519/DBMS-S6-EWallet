## Welcome to the E wallet integration project docs

### To Run the app

#### 1. Setup the backend and tables
$ cd dbms-project
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt

#### 2. Create a postgres server
postgresql=# CREATE DATABASE e_wallet_db;

#### 3. Add the server link to a .env file and generate a secret key


#### 4. Run the backend server
$ uvicorn main:app --reload

#### Set up the frontend
$ cd ../dbms-frontend
$ nvm use 22
$ npm install (or npm i)
$ npm start

#### App should be running by now