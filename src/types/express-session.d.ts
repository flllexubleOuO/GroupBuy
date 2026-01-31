// 扩展 express-session 的 SessionData 类型
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    userRole?: 'USER' | 'MERCHANT' | 'ADMIN';
    userId?: string;
    auth?: {
      userId: string;
      role: 'USER' | 'MERCHANT' | 'ADMIN';
    };

    cart?: {
      items: Record<string, number>; // packageId -> quantity
    };
  }
}

