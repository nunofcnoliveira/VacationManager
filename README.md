Cleverti - Vacation manager (frontend)
======================================

Pre-requisites
--------------
 * Git
 * Node.js			https://nodejs.org/en/download/package-manager/
 * Yarn				https://yarnpkg.com/lang/en/docs/install/#linux-tab

Installation
------------
1) Download repository:
```
$ git clone https://git.cleverti.com/nuno.oliveira/VacationManagerUI.git vacationmanager_frontend
```

2) Navigate to .../vacationmanager_frontend

3) Select the correct git branch:
```
$ git checkout develop
```


Installation
------------

4) Install dependencies:
```
$ yarn
```

5) Run it:
```
$ yarn start
```

6) Test it:
```
http://localhost:3000
```

Deployment considerations
-------------------------
 * The backend URL is defined in /vacationmanager_frontend/src/containers/GlobalSettings.js. Change as appropriate prior to deployment;
 * At this stage, the application is not build yet. To do so, run:
	$ yarn build

...which will build the application for production in the '/vacationmanager_frontend/build' folder.
```
Ref: https://github.com/facebook/create-react-app
```

Copy the folder's contants and place them in the server's relevant location.
