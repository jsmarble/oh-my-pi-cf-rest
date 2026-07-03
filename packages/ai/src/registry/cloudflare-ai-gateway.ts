import * as AIError from "../error";
import type { OAuthController, OAuthLoginCallbacks } from "./oauth/types";
import type { ProviderDefinition } from "./types";

const AUTH_URL = "https://developers.cloudflare.com/ai-gateway/usage/rest-api/";

const LEGACY_TOKEN_PREFIX = "cf-aig-";
const LEGACY_TOKEN_MESSAGE =
	"Detected a legacy Cloudflare AI Gateway token (`cf-aig-…`). Legacy tokens only work against `gateway.ai.cloudflare.com`. " +
	"To use this token, set `providers.cloudflare-ai-gateway.baseUrl` in your `models.yml` to " +
	"`https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/anthropic`. " +
	"To use the modern REST API, generate a new API token from your Cloudflare dashboard (AI Gateway → REST API).";

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
			"Copy a Cloudflare API token with AI Gateway permissions. Configure account/gateway routing separately. " +
			"Legacy `cf-aig-…` tokens are rejected here — see the error for the legacy baseUrl.",
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

	if (trimmed.startsWith(LEGACY_TOKEN_PREFIX)) {
		throw new AIError.LegacyCloudflareTokenError(LEGACY_TOKEN_MESSAGE);
	}

	return trimmed;
}

export const cloudflareAiGatewayProvider = {
	id: "cloudflare-ai-gateway",
	name: "Cloudflare AI Gateway",
	login: (cb: OAuthLoginCallbacks) => loginCloudflareAiGateway(cb),
} as const satisfies ProviderDefinition;
