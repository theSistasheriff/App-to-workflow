import dotenv from "dotenv";
import fs from "fs";
import http from "http";
import { Octokit, App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { createAppAuth } from "@octokit/auth-app";

dotenv.config();

const appId = process.env.APP_ID;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const secret = process.env.WEBHOOK_SECRET;

const wf_repo = process.env.CENTRAL_REPO;
const repo_owner = process.env.CENTRAL_REPO_OWNER;
const wf_name = process.env.WORKFLOW_NAME;
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;

// Create GitHub App
const app = new App({
  appId,
  privateKey,
  webhooks: { secret },
});
// Log authenticated app name
const { data } = await app.octokit.request("/app");
console.log(`✅ Authenticated as GitHub App: ${data.name}`);

// PR opened handler
app.webhooks.on("pull_request.opened", async ({ payload }) => {
  try {
    console.log(
      `📦 PR #${payload.pull_request.number} from ${payload.pull_request.head.repo.full_name} on branch ${payload.pull_request.head.ref}`
    );

    const installationId = payload.installation.id;
    const branch = payload.pull_request.head.ref;
    const prNumber = payload.pull_request.number;
    const baseUrl =
      enterpriseHostname && enterpriseHostname !== "api.github.com"
        ? `https://${enterpriseHostname}/api/v3`
        : "https://api.github.com";

    // App-level client
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey },
      baseUrl,
    });

    let centralInstallation;
    try {
      const { data } = await appOctokit.rest.apps.getRepoInstallation({
        owner: repo_owner,
        repo: wf_repo,
      });
      centralInstallation = data;
    } catch (err) {
      if (err.status === 404) {
        console.error(`❌ App is not installed on ${repo_owner}/${wf_repo}`);
        return;
      }
      throw err;
    }

    // Installation-level client
    const centralAuth = await createAppAuth({
      appId,
      privateKey,
      installationId: centralInstallation.id,
    })({ type: "installation" });

    const centralOctokit = new Octokit({
      auth: centralAuth.token,
      baseUrl,
    });

    // Trigger workflow
    await centralOctokit.rest.actions.createWorkflowDispatch({
      owner: repo_owner,
      repo: wf_repo,
      workflow_id: wf_name,
      ref: "main",
      inputs: {
        repo: payload.pull_request.head.repo.full_name,
        branch,
        pr_number: prNumber.toString(),
      },
    });

    console.log(`✅ Workflow dispatched for ${branch}`);
  } catch (error) {
    console.error("🔥 Error in PR webhook handler:", error);
  }
});

// Launch webhook server
const port = process.env.PORT || 3000;
const path = "/api/webhook";
http
  .createServer(createNodeMiddleware(app.webhooks, { path }))
  .listen(port, () => {
    console.log(`🚀 Server listening at: http://localhost:${port}${path}`);
  });
