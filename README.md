
### To install dependencies
npm install

### Run server
npm run server

smee
npx smee -u https://smee.io/{last part} -t http://localhost:3000/api/webhook


## Installing App on GitHub

### Permissinons

- Actions - Read & Write
- Contents - Read
- Metadata - Read
- Pull Request - Read & Write

### Subscribe
- Pull_request


### Install dependencies
npm install

### Important library
- Octokit (could also use "expressjs")
    - https://github.com/octokit/octokit.js

### Octokit
https://octokit.github.io/rest.js/v22/#apps

## Progress report to Manni
We have 2 workflow to test, Flake1.yml and Flake2.yml.

The server/GHA code in app.js is running. 
    - It is stuck on "❌ Error! Status: 404. Message: Not Found" (row 89)

Workflows have not yet been able to test call

On My confluence page there is a page "GitHub FossId" that describes what the demo concluded.
    Short Summary:
We do now try to have a central repository including a workflow. A GitHub App to call the WF and send inputs on PR.opened.
The WF is supposed to run FossId (Flake8 as test), and feed back the result as a comment to the repository making a pull request.

## Further steps
The enterprise trail is up. So a new account needs to be created on github to test on.


## Current support links
https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

https://docs.github.com/en/rest/codespaces/codespaces?apiVersion=2022-11-28

https://octokit.github.io/rest.js/v22/#apps (We should use either "createDispatchEvent" or "createWorkflowDispatch")

https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/using-webhooks-with-github-apps

https://github.com/octokit/octokit.js?tab=readme-ov-file