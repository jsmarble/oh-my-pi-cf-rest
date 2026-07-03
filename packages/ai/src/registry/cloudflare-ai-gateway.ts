import * as AIError from "../error";
import type { OAuthController, OAuthLoginCallbacks } from "./oauth/types";
import type { ProviderDefinition } from "./types";

const AUTH_URL = "https://developers.cloudflare.com/ai-gateway/usage/rest-api/";

/**
 * Login to Cloudflare AI Gateway REST API.
 *
 * Opens browser to Cloudflare's REST API docs and prompts for an API token with
 * AI Gateway permissions. Account/gateway routing is configured separately via
 * `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_GATEWAY_ID`, or provider overrides in
 * `models.yml`.
 */
export async function loginCloudflareAiGateway(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new AIError.OnPromptRequiredError("Cloudflare AI Gateway");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions:
			"Copy a Cloudflare API token with AI Gateway permissions. Configure account/gateway routing separately.",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Cloudflare API token",
		placeholder: "v1.0-…",
	});

	if (options.signal?.aborted) {
		throw new AIError.LoginCancelledError();
	}

	const trimmed = apiKey.trim();
	if (!trimmed) {
		throw new AIError.ApiKeyRequiredError();
	}

	return trimmed;
}

export const cloudflareAiGatewayProvider = {
	id: "cloudflare-ai-gateway",
	name: "Cloudflare AI Gateway",
	login: (cb: OAuthLoginCallbacks) => loginCloudflareAiGateway(cb),
} as const satisfies ProviderDefinition;
