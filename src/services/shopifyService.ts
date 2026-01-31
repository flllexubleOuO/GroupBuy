import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    inventory_quantity?: number;
  }>;
  images?: Array<{
    src: string;
  }>;
}

interface ShopifyProductResponse {
  products: ShopifyProduct[];
}

interface CreateOrderPayload {
  line_items: Array<{
    variant_id?: number; // Shopify 变体ID（用于关联已有商品）
    product_id?: number; // Shopify 商品ID（备用）
    title?: string; // 商品标题（如果没有variant_id则使用）
    price: string;
    quantity: number;
  }>;
  shipping_address: {
    first_name: string;
    last_name?: string;
    phone: string;
    address1: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
  financial_status: 'paid';
  note?: string;
  tags?: string[];
}

interface ShopifyOrderResponse {
  order: {
    id: number;
    name: string;
    [key: string]: any;
  };
}

class ShopifyService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}`;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取所有商品列表
   */
  async getProducts(): Promise<ShopifyProduct[]> {
    try {
      const allProducts: ShopifyProduct[] = [];
      let nextUrl: string | null = '/products.json?limit=250';

      while (nextUrl) {
        const response = await this.client.get<ShopifyProductResponse>(nextUrl);
        const products = response.data.products;
        allProducts.push(...products);

        // 检查是否有下一页
        const linkHeader: string | undefined = response.headers.link as string | undefined;
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>; rel="next"/);
          if (nextMatch) {
            const fullNextUrl: string = nextMatch[1];
            // 提取相对路径（去掉 baseUrl）
            nextUrl = fullNextUrl.replace(this.baseUrl, '');
          } else {
            nextUrl = null;
          }
        } else {
          nextUrl = null;
        }
      }

      return allProducts;
    } catch (error: any) {
      console.error('Error fetching products from Shopify:', error.response?.data || error.message);
      throw new Error(`Failed to fetch products: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * 创建已付款订单
   */
  async createPaidOrder(
    orderData: {
      items: Array<{ 
        title: string; 
        price: string; 
        quantity: number;
        shopifyProductId?: string;
        shopifyVariantId?: string;
      }>;
      customerName: string;
      phone: string;
      address: string;
      deliveryTime: string;
      localOrderId: string;
      paymentMethod?: string;
      optionalNote?: string;
    }
  ): Promise<{ id: number; name: string }> {
    try {
      // 解析客户姓名（简单处理，假设第一个字是姓，其余是名）
      const nameParts = orderData.customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || orderData.customerName;
      const lastName = nameParts.slice(1).join(' ') || '';

      // 构建订单备注
      const paymentInfo = orderData.paymentMethod === 'cash_on_delivery' 
        ? 'Payment: Cash on Delivery (送货到户时付款)'
        : 'Payment: Bank Transfer (已转账，截图已保存)';
      
      const note = [
        'Source: WeChat Group-buy',
        `Delivery time: ${orderData.deliveryTime}`,
        `Local order id: ${orderData.localOrderId}`,
        paymentInfo,
        orderData.optionalNote ? `Customer note: ${orderData.optionalNote}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const payload: CreateOrderPayload = {
        line_items: orderData.items.map((item) => {
          // 如果有变体ID，使用变体ID关联已有商品
          if (item.shopifyVariantId) {
            return {
              variant_id: parseInt(item.shopifyVariantId),
              price: item.price,
              quantity: item.quantity,
            };
          }
          // 如果有商品ID但没有变体ID，尝试使用商品ID
          if (item.shopifyProductId) {
            return {
              product_id: parseInt(item.shopifyProductId),
              price: item.price,
              quantity: item.quantity,
            };
          }
          // 如果没有ID，使用自定义商品（兼容旧数据）
          return {
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          };
        }),
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          phone: orderData.phone,
          address1: orderData.address,
          city: 'Sydney',
          province: 'NSW',
          country: 'AU', // Australia (Sydney)
        },
        financial_status: 'paid',
        note: note,
        tags: ['TG', 'WeChat Group-buy', 'Local Payment'],
      };

      const response = await this.client.post<ShopifyOrderResponse>(
        '/orders.json',
        { order: payload }
      );

      return {
        id: response.data.order.id,
        name: response.data.order.name,
      };
    } catch (error: any) {
      console.error('Error creating order in Shopify:', error.response?.data || error.message);
      throw new Error(`Failed to create Shopify order: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * 删除 Shopify 订单
   */
  async deleteOrder(shopifyOrderId: string): Promise<void> {
    try {
      await this.client.delete(`/orders/${shopifyOrderId}.json`);
    } catch (error: any) {
      // 如果订单不存在（404），不算错误，可能已经被删除了
      if (error.response?.status === 404) {
        console.warn(`Shopify order ${shopifyOrderId} not found, may have been deleted already`);
        return;
      }
      console.error('Error deleting Shopify order:', error.response?.data || error.message);
      throw new Error(`Failed to delete Shopify order: ${error.response?.data?.errors || error.message}`);
    }
  }
}

export const shopifyService = new ShopifyService();
export type { ShopifyProduct };

