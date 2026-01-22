import app from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🏠 Home page: http://localhost:${PORT}/home`);
  console.log(`📱 Order page: http://localhost:${PORT}/order`);
  console.log(`🔍 Query order: http://localhost:${PORT}/query-order`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin/login`);
});

