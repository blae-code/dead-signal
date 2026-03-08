import { base44 } from "@/api/base44Client";

const missingFunctionIds = new Set();

const toStatusCode = (error) => {
  const status = Number(error?.response?.status);
  return Number.isFinite(status) ? status : null;
};

const buildFunctionError = (functionId, message) => {
  const error = new Error(message || `Function '${functionId}' failed.`);
  error.code = "FUNCTION_INVOKE_FAILED";
  return error;
};

const buildUnavailableError = (functionId) => {
  const error = new Error(`Function '${functionId}' is unavailable in this environment.`);
  error.code = "FUNCTION_UNAVAILABLE";
  return error;
};

export const isFunctionUnavailable = (functionId) => missingFunctionIds.has(functionId);

export const invokeFunction = async (functionId, payload = {}, { allowUnavailable = false } = {}) => {
  if (missingFunctionIds.has(functionId)) {
    if (allowUnavailable) return { unavailable: true, data: null };
    throw buildUnavailableError(functionId);
  }

  try {
    const response = await base44.functions.invoke(functionId, payload);
    if (response?.data && !response.data.error) {
      return { unavailable: false, data: response.data };
    }
    throw buildFunctionError(functionId, response?.data?.error || undefined);
  } catch (error) {
    const statusCode = toStatusCode(error);
    if (statusCode === 404) {
      missingFunctionIds.add(functionId);
      if (allowUnavailable) {
        return { unavailable: true, data: null };
      }
      throw buildUnavailableError(functionId);
    }
    throw error;
  }
};

export const invokeFunctionOrFallback = async (functionId, payload = {}, fallbackFactory = () => null) => {
  const result = await invokeFunction(functionId, payload, { allowUnavailable: true });
  if (result.unavailable) {
    return fallbackFactory();
  }
  return result.data;
};
