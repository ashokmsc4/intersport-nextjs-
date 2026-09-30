import { MagentoError } from "./client";
import { WAF_MESSAGE } from "./backend-headers";

/** Short, non-secret reason for a failed Magento call, shown to help set up a deployment. */
export function describeError(error: unknown): string {
  if (error instanceof MagentoError) {
    if (error.message === WAF_MESSAGE) return error.message;
    // Production's firewall blocks some endpoints for unknown User-Agents.
    return error.status === 403 && !process.env.MAGENTO_USER_AGENT
      ? `${error.message} (set MAGENTO_USER_AGENT and restart)`
      : error.message;
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    return [error.message, cause?.code ?? cause?.message].filter(Boolean).join(": ");
  }
  return String(error);
}

/** Resolves to the value, or to a logged, displayable failure reason. */
export async function settle<T>(
  promise: Promise<T>,
  label: string,
): Promise<{ value: T; error: null } | { value: null; error: string }> {
  try {
    return { value: await promise, error: null };
  } catch (error) {
    console.error(`[magento] ${label}:`, error);
    return { value: null, error: describeError(error) };
  }
}
