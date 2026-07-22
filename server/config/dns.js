import dns from 'dns';

// Some machines have Node's DNS resolver pointed at a dead server (e.g. 127.0.0.1
// with no local DNS daemon), which breaks the SRV lookup that `mongodb+srv://`
// URIs require, surfacing as `querySrv ECONNREFUSED`. Point Node at a working
// public resolver so Atlas can be reached. Override with DNS_SERVERS if needed.
export function ensureDnsResolver() {
  const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const current = dns.getServers();
  const onlyLoopback = current.every((server) => server === '127.0.0.1' || server === '::1');

  // Only override when the configured resolver is unusable (loopback with nothing
  // listening) so we don't disturb machines that already resolve correctly.
  if (onlyLoopback && servers.length) {
    dns.setServers(servers);
  }
}
