// 扩展 express-session 的 SessionData 类型
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
  }
}

