import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'

dotenv.config()

//const fs = require('fs')

//const express = require('express')
//const { createAppAuth } = require('@octokit/auth-app')
//const { Octokit } = require('@octokit/rest')
//const bodyParser = require('body-parser')

const {
    APP_ID,
    PRIVATE_KEY_PATH,
    WEBHOOK_SECRET,
    CENTRAL_REPO,
    CENTRAL_REPO_OWNER,
} = process.env;

//const app = express()
const app = new App({
    appId: APP_ID,
    privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
    webhooks: {
        secret: WEBHOOK_SECRET
    }
})

//app.use(bodyParser.json())

const { data } = await app.octokit.request('/app')

app.octokit.log.debug(`Authenticated as ${data.name}`)

app.webhooks.on(['pull_request.opened', 'pull_request.synchronize', 'pull_request.reopened'], async (req, res) => {
    const event = req.headers['x-github-event']
    const payload = req.body

    
        const installationId = payload.installation.id
        const sourceRepo = payload.pull_request.head.repo.full_name
        const branch = payload.pull_request.head.ref
        const prNumber = payload.pull_request.number

        const auth = createAppAuth({
            appId: APP_ID,
            privateKey: PRIVATE_KEY,
            installationId,
        });

        const installationAuth = await auth({ type: 'installation' })
        const octokit =new Octokit({ auth: installationAuth.token })

        try{
            await octokit.rest.createDispatchEvent({
                owner: CENTRAL_REPO_OWNER,
                repo: CENTRAL_REPO,
                event_type: 'run-lint',
                client_payload: {
                    source_repo: sourceRepo,
                branch: branch,
                pr_number: prNumber,
                installation_id: installationId,
                },
            })
        } catch (error) {
            if (error.response) {
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
            } else {
                console.error(`Error message: ${error}`)
            }
        }

   
})

// Optional: Handle errors
app.webhooks.onError((error) => {
  if (error.name === 'AggregateError') {
    // Log Secret verification errors
    console.log(`Error processing request: ${error.event}`)
  } else {
    console.log(error)
  }
})

// Launch a web server to listen for GitHub webhooks
const port = process.env.PORT || 3000
const path = '/api/webhook'
const localWebhookUrl = `http://localhost:${port}${path}`

// See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
const middleware = createNodeMiddleware(app.webhooks, { path })

http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`)
  console.log('Press Ctrl + C to quit.')
})

