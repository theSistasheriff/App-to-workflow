import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import { createAppAuth } from '@octokit/auth-app'

// Load environment variables from .env file
dotenv.config()

const appId = process.env.APP_ID
const privateKeyPath = process.env.PRIVATE_KEY_PATH
const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
const secret = process.env.WEBHOOK_SECRET

const wf_repo = process.env.CENTRAL_REPO
const repo_owner = process.env.CENTRAL_REPO_OWNER
const wf_name = process.env.WORKFLOW_NAME

// Extra for live usage
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME

// Create an authenticated Octokit client authenticated as a GitHub App
const app = new App({
    appId,
    privateKey,
    webhooks: {
      secret
    },
    // Optional: Add the base URL for Enterprise in .env for live usage, or need 
    ...(enterpriseHostname && {
    Octokit: Octokit.defaults({
      baseUrl: `https://${enterpriseHostname}/api/v3`
    })
  })
})

// Optional: Get & log the authenticated app's name
const { data } = await app.octokit.request('/app')
app.octokit.log.debug(`Authenticated as ${data.name}`)

app.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {

    console.log(`A pull request event for #${payload.pull_request.number}`)

    const installationId = payload.installation.id
    const sourceRepo = payload.pull_request.head.repo.full_name
    const branch = payload.pull_request.head.ref
    const prNumber = payload.pull_request.number

    //This is a debugging log to see the values
    console.log(`Installation ID: ${installationId}`)
    console.log(`Source Repository: ${sourceRepo}`)
    console.log(`Branch: ${branch}`)
    console.log(`Pull Request Number: ${prNumber}`)
    console.log(`Workflow Name: ${wf_name}`)
    console.log(`Central Workflow Repository: ${repo_owner}`)
    console.log(`Workflow repo: ${wf_repo}`)

    // Create an authenticated Octokit client for the installation
    const auth = createAppAuth({
        appId,
        privateKey,
        installationId,
    });
    const installationAuth = await auth({ type: 'installation' })
    const centralOctokit = new Octokit({ auth: installationAuth.token })

    console.log(`Installation Auth Token: ${installationAuth.token}`)

    // Trigger the workflow dispatch event of Flake1.yml.
    // Send information of the source repository, branch, and pull request number
    try {
        await octokit.rest.actions.createWorkflowDispatch({
            owner: repo_owner,
            repo: wf_repo,
            workflow_id: wf_name,
            ref: 'main',
            inputs: {
                source_repo: sourceRepo,
                branch: branch,
                pr_number: prNumber,
                installation_id: installationId,
            },
        });
        console.log(`✅ Workflow dispatched for ${sourceRepo} on branch ${branch}`);
    } catch (error) {
        if (error.response) {
            console.error(`❌ Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        } else {
            console.error(`❌ Error message: ${error}`);
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

