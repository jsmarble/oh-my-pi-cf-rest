import { describe, expect, it } from "bun:test";
import { loginCloudflareAiGateway } from "@oh-my-pi/pi-ai/registry/cloudflare-ai-gateway";
import * as AIError from "@oh-my-pi/pi-ai/error";

describe("cloudflare-ai-gateway login", () => {
	it("accepts and trims a modern REST API token (v1.0-…)", async () => {
		let authUrl: string | undefined;
		let authInstructions: string | undefined;
		let promptMessage: string | undefined;
		let promptPlaceholder: string | undefined;

		const apiKey = await loginCloudflareAiGateway({
			onAuth: info => {
				authUrl = info.url;
				authInstructions = info.instructions;
			},
			onPrompt: async prompt => {
				promptMessage = prompt.message;
				promptPlaceholder = prompt.placeholder;
				return "  v1.0-abc123  ";
			},
		});

		expect(apiKey).toBe("v1.0-abc123");
		expect(authUrl).toBe("https://developers.cloudflare.com/ai-gateway/usage/rest-api/");
		expect(authInstructions).toContain("Configure account/gateway routing separately");
		expect(promptMessage).toBe("Paste your Cloudflare API token");
		expect(promptPlaceholder).toBe("v1.0-…");
	});

	it("rejects an empty token with ApiKeyRequiredError", async () => {
		await expect(
			loginCloudflareAiGateway({
				onPrompt: async () => "",
			}),
		).rejects.toBeInstanceOf(AIError.ApiKeyRequiredError);
	});

	it("rejects a cancelled signal with LoginCancelledError", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			loginCloudflareAiGateway({
				onPrompt: async () => "v1.0-abc123",
				signal: controller.signal,
			}),
		).rejects.toBeInstanceOf(AIError.LoginCancelledError);
	});

	it("rejects a legacy cf-aig-… token with LegacyCloudflareTokenError", async () => {
		let thrown: unknown;
		try {
			await loginCloudflareAiGateway({
				onPrompt: async () => "cf-aig-legacy-token-value",
			});
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(AIError.LegacyCloudflareTokenError);
		const message = thrown instanceof Error ? thrown.message : "";
		expect(message).toContain("cf-aig-");
		expect(message).toContain("gateway.ai.cloudflare.com");
	});

	it("detects the legacy prefix only after trimming whitespace", async () => {
		await expect(
			loginCloudflareAiGateway({
				onPrompt: async () => "  cf-aig-foo  ",
			}),
		).rejects.toBeInstanceOf(AIError.LegacyCloudflareTokenError);
	});
});
