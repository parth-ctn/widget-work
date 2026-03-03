import type { URLParams } from '../types/index';

/**
 * Extracts widget parameters from script tag URL
 */
export const getScriptParams = (): URLParams => {
  const scriptTag = document.currentScript as HTMLScriptElement;
  const scriptSrc = new URL(scriptTag.src);

  return {
    agentId: scriptSrc.searchParams.get('agentId'),
    tokenId: scriptSrc.searchParams.get('tokenId'),
    ownerId: scriptSrc.searchParams.get('ownerId'),
  };
};

/**
 * Validates required script parameters
 */
export const validateScriptParams = (params: URLParams): boolean => {
  if (!params.agentId || !params.tokenId || !params.ownerId) {
    console.error('Webmap Widget: Required parameters missing. Widget will not load.');
    return false;
  }
  return true;
};
