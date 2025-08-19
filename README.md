
### To install dependencies
npm install

### Run server
npm run server 
### Connect Webhook proxy to localhost
smee
npx smee -u https://smee.io/{last part} -t http://localhost:3000/api/webhook


## Installing App on GitHub

### Permissions

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

## Setup
This application needs to be installed on a organization level. 

A PAT token needs to be set up in the central workflows repository to ensure proper authentication.
1) Generating the PAT token:
Personal profile -> Settings -> Developer settings -> Personal access tokens -> Tokens (Classic) -> Generate new token 
2) Setting up the PAT token
Repository settings -> Secrets and variables -> Actions -> New repository secret.

The central workflows repository actions permissions access must be set to "Accessible from repositories in the 'your-org' organization.
Central workflows repository -> Settings -> Actions -> General -> Access.

The .env file must include:
The name of the central workflows repository.
The owner of the repository (e.g github organization name).
App ID (Organization Settings -> Developer Settings -> Gihub apps -> This application).
Private key (found in the same path as the app ID).

## Further steps
The enterprise trial is up. So a new account needs to be created on github to test on.


## Current support links
https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

https://docs.github.com/en/rest/codespaces/codespaces?apiVersion=2022-11-28

https://octokit.github.io/rest.js/v22/#apps (We should use either "createDispatchEvent" or "createWorkflowDispatch")

https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/using-webhooks-with-github-apps

https://github.com/octokit/octokit.js?tab=readme-ov-file