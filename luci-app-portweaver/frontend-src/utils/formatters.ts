export function formatBytes(bytes: number = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MiB`;
  return `${(bytes / 1073741824).toFixed(2)} GiB`;
}

export function formatUptime(seconds: number = 0): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m${sec}s`;
}

export function getErrorMessage(error_code?: number): string | null {
  if (error_code === undefined || error_code === 0) return null;
  const messages: Record<string, string> = {
    "0": "OK",
    "-1": "Memory allocation failed",
    "-2": "Failed to bind to port",
    "-3": "Address or port already in use (EADDRINUSE)",
    "-4": "Permission denied - unable to bind to port (EACCES)",
    "-5": "Invalid address format",
    "-98": "Address already in use",
    "-91": "Protocol wrong type for socket",
    "-92": "Protocol not available",
    "-93": "Protocol not supported",
    "-94": "Socket type not supported",
    "-95": "Operation not supported on transport endpoint",
    "-96": "Protocol family not supported",
    "-97": "Address family not supported by protocol",
    "-99": "Cannot assign requested address",
    "-100": "Network is down",
    "-101": "Network is unreachable",
  };
  return messages[String(error_code)] || `Unknown error (code: ${error_code})`;
}
