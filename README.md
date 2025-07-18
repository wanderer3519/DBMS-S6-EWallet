## Welcome to the E wallet integration project docs

### To Run the app

#### 1. Setup the backend and tables
``` bash []
$ cd dbms-backend	        # navigate to backend
$ python3 -m venv venv	    # create a venv
$ source venv/bin/activate  # activate venv
$ pip install poetry 	    # install poetry
$ poetry install --no-root  # install all packages
```

#### 4. Run the backend server
``` bash []
$ uvicorn api.main:app --reload # or just use
$ make run
```

#### Set up the frontend
``` bash []
$ cd dbms-frontend         # navigate to frontend
$ npm install (or npm i)   # install all packages
$ npm start		           # run frontend
```

#### App should be running by now
- Open a browser and go to http://localhost/3000 to see the app.