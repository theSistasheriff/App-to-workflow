import dotenv from "dotenv";
import fs from "fs";
import { Octokit, App } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { ServiceBusClient } from "@azure/service-bus";

dotenv.config();

// Github App configuration
const appId = process.env.APP_ID;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const secret = process.env.WEBHOOK_SECRET;

// Github Workflow configuration
const wf_repo = process.env.CENTRAL_REPO;
const repo_owner = process.env.CENTRAL_REPO_OWNER;
const wf_name = process.env.WORKFLOW_NAME;
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;

// Azure Service Bus configuration
const serviceBusConnectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const serviceBusQueueName = process.env.SERVICE_BUS_QUEUE_NAME;

// Check for required environment variables
if (!appId || !privateKeyPath || !secret || !wf_repo || !repo_owner || !wf_name || !serviceBusConnectionString || !serviceBusQueueName) {
  console.error("❌ One or more required environment variables are missing.");
  process.exit(1);
}

const sbClient = new ServiceBusClient(serviceBusConnectionString);
const receiver = sbClient.createReceiver(serviceBusQueueName);

// Create GitHub App
const app = new App({
  appId,
  privateKey,
  webhooks: { secret },
});
// Log authenticated app name
const { data } = await app.octokit.request("/app");
console.log(`✅ Authenticated as GitHub App: ${data.name}`);

// Main function to start listening for messages
async function main() {
  console.log("🚀 Starting Service Bus message listener...");

  // Register the message handler
  receiver.subscribe({
    // This function is called every time a new message is received
    processMessage: async (message) => {
      // The message body is now a simplified object.
      const simplifiedPayload = message.body;

      console.log(`📥 Received message: ${JSON.stringify(simplifiedPayload, null, 2)}`);
      
      try {
        await receiver.completeMessage(message);

        // Access the properties from the simplified payload
        const branch = simplifiedPayload.branch;
        const prNumber = simplifiedPayload.prNumber;
        const repoFullName = simplifiedPayload.repoFullName;

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
            console.error(
              `❌ App is not installed on ${repo_owner}/${wf_repo}`
            );
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
            repo: repoFullName,
            branch,
            pr_number: prNumber.toString(),
          },
        });
        console.log(`✅ Workflow dispatched for ${branch}`);
      } catch (error) {
        console.error("🔥 Error processing message:", error);
      }
    },

    // This function is called if an error occurs during processing
    processError: async (args) => {
      console.error(`🔴 Error from Service Bus: ${args.error.message}`);
    },
  });

  // Keep the process alive to continue listening for messages
  process.on("SIGINT", async () => {
    console.log("\nClosing Service Bus receiver...");
    await receiver.close();
    await sbClient.close();
    console.log("Receiver closed. Exiting.");
    process.exit(0);
  });
}

// Start the application
main();
