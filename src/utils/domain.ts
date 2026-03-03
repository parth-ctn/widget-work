import type { DomainInfo } from '../types/index';

/**
 * Gets the current domain information from window.location
 */
export const getDomainInfo = (): DomainInfo => {
  const { protocol, hostname, port } = window.location;

  let currentDomain = `${protocol}//${hostname}`;
  if (hostname === 'localhost' && port) {
    currentDomain += `:${port}`;
  }

  return {
    protocol,
    hostname,
    port,
    currentDomain,
  };
};
