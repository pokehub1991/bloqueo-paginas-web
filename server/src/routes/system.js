import { Router } from 'express';
import { getLocalIpAddresses } from '../utils/network.js';

const router = Router();

router.get('/info', (req, res) => {
  const ips = getLocalIpAddresses();
  const port = process.env.PORT || 4000;

  return res.json({
    lanIps: ips,
    recommendedUrl: `http://${ips[0] || 'localhost'}:${port}`,
    port: Number(port),
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    osPlatform: process.platform
  });
});

export default router;
