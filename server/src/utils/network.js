import os from 'os';

/**
 * Obtiene todas las direcciones IPv4 de red local no internas (LAN)
 * @returns {string[]} Lista de direcciones IP (ej. ['192.168.1.50'])
 */
export function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // Filtrar IPv4 y no loopback (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}
