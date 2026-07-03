import { afterEach, describe, expect, test } from "bun:test";
import { getBundledModels } from "@oh-my-pi/pi-catalog/models";
import { DEFAULT_MODEL_PER_PROVIDER, PROVIDER_DESCRIPTORS } from "@oh-my-pi/pi-catalog/provider-models/descriptors";
import {
	cloudflareAiGatewayModelManagerOptions,
	MODELS_DEV_PROVIDER_DESCRIPTORS,
	mapModelsDevToModels,
} from "@oh-my-pi/pi-catalog/provider-models/openai-compat";

const ENV_KEYS = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_GATEWAY_ID", "CLOUDFLARE_AI_GATEWAY_GATEWAY_ID"] as const;
const ORIGINAL_ENV = new Map(ENV_KEYS.map(key => [key, Bun.env[key]]));

function restoreEnv(): void {
	for (const key of ENV_KEYS) {
		const value = ORIGINAL_ENV.get(key);
		if (value === undefined) {
			delete Bun.env[key];
		} else {
			Bun.env[key] = value;
		}
	}
}

afterEach(() => {
	restoreEnv();
});

describe("Cloudflare AI Gateway REST provider support", () => {
	test("registers descriptor env fallbacks and remaps bundled models to REST semantics", () => {
		Bun.env.CLOUDFLARE_ACCOUNT_ID = "acct123";
		Bun.env.CLOUDFLARE_AI_GATEWAY_ID = "gateway-1";

		const descriptor = PROVIDER_DESCRIPTORS.find(item => item.providerId === "cloudflare-ai-gateway");
		expect(descriptor).toBeDefined();
		expect(descriptor?.defaultModel).toBe("anthropic/claude-opus-4-8");
		expect(descriptor?.catalogDiscovery?.label).toBe("Cloudflare AI Gateway");
		expect(descriptor?.catalogDiscovery?.envVars).toEqual(["CLOUDFLARE_AI_GATEWAY_API_KEY", "CLOUDFLARE_API_TOKEN"]);
		expect(DEFAULT_MODEL_PER_PROVIDER["cloudflare-ai-gateway"]).toBe("anthropic/claude-opus-4-8");

		const options = cloudflareAiGatewayModelManagerOptions();
		const bundled = options.staticModels ?? getBundledModels("cloudflare-ai-gateway");
		const anthropic = bundled.find(model => model.id === "anthropic/claude-sonnet-4-6");
		const openai = bundled.find(model => model.id === "openai/gpt-5.4");
		const workers = bundled.find(model => model.id === "workers-ai/@cf/moonshotai/kimi-k2.6");

		expect(anthropic).toMatchObject({
			api: "anthropic-messages",
			provider: "cloudflare-ai-gateway",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/acct123/ai/v1",
			headers: { "cf-aig-gateway-id": "gateway-1" },
		});
		expect(openai).toMatchObject({
			api: "openai-completions",
			provider: "cloudflare-ai-gateway",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/acct123/ai/v1",
			headers: { "cf-aig-gateway-id": "gateway-1" },
		});
		expect(workers).toMatchObject({
			api: "openai-completions",
			provider: "cloudflare-ai-gateway",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/acct123/ai/v1",
			requestModelId: "@cf/moonshotai/kimi-k2.6",
			headers: { "cf-aig-gateway-id": "gateway-1" },
		});
	});

	test("maps models.dev Cloudflare entries to REST APIs and workers-ai wire ids", () => {
		const mapped = mapModelsDevToModels(
			{
				"cloudflare-ai-gateway": {
					models: {
						"anthropic/claude-sonnet-4-6": {
							id: "anthropic/claude-sonnet-4-6",
							name: "anthropic/claude-sonnet-4-6",
							display_name: "Claude Sonnet 4.6",
							tool_call: true,
							reasoning: true,
							modalities: { input: ["text", "image"] },
							limit: { context: 1_000_000, output: 64_000 },
							cost: { input: 3, output: 15, cache_read_input: 0.3, cache_write_input: 3.75 },
						},
						"openai/gpt-5.4": {
							id: "openai/gpt-5.4",
							name: "openai/gpt-5.4",
							display_name: "GPT-5.4",
							tool_call: true,
							reasoning: true,
							modalities: { input: ["text", "image"] },
							limit: { context: 1_050_000, output: 128_000 },
							cost: { input: 2.5, output: 15 },
						},
						"workers-ai/@cf/moonshotai/kimi-k2.6": {
							id: "workers-ai/@cf/moonshotai/kimi-k2.6",
							name: "workers-ai/@cf/moonshotai/kimi-k2.6",
							display_name: "Kimi K2.6",
							tool_call: true,
							reasoning: true,
							modalities: { input: ["text", "image"] },
							limit: { context: 262_144, output: 262_144 },
							cost: { input: 0.95, output: 4, cache_read_input: 0.16 },
						},
					},
				},
			},
			MODELS_DEV_PROVIDER_DESCRIPTORS,
		);

		const anthropic = mapped.find(
			model => model.provider === "cloudflare-ai-gateway" && model.id === "anthropic/claude-sonnet-4-6",
		);
		const openai = mapped.find(model => model.provider === "cloudflare-ai-gateway" && model.id === "openai/gpt-5.4");
		const workers = mapped.find(
			model => model.provider === "cloudflare-ai-gateway" && model.id === "workers-ai/@cf/moonshotai/kimi-k2.6",
		);

		expect(anthropic).toMatchObject({
			api: "anthropic-messages",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/<account>/ai/v1",
		});
		expect(openai).toMatchObject({
			api: "openai-completions",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/<account>/ai/v1",
		});
		expect(workers).toMatchObject({
			api: "openai-completions",
			baseUrl: "https://api.cloudflare.com/client/v4/accounts/<account>/ai/v1",
			requestModelId: "@cf/moonshotai/kimi-k2.6",
		});
	});
});
