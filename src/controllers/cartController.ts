import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { mapProductNames } from '../utils/productNameMapper';

const prisma = new PrismaClient();

function getCart(req: Request) {
  if (!req.session.cart) req.session.cart = { items: {} };
  if (!req.session.cart.items) req.session.cart.items = {};
  return req.session.cart;
}

function normalizeQty(value: any): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export const showCartPage = async (req: Request, res: Response) => {
  const cart = getCart(req);
  const ids = Object.keys(cart.items).filter((id) => cart.items[id] > 0);

  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } });
  const phone = user?.phone || '';

  if (ids.length === 0) {
    return res.render('public/cart', {
      cartPackages: [],
      allowedDeliveryDates: [],
      totals: { total: 0, originalTotal: 0 },
      phone,
      userEmail: user?.email || '',
      error: null,
      form: {},
    });
  }

  const packages = await prisma.package.findMany({ where: { id: { in: ids }, isActive: true } });

  // Build cart view models in stable order (by sortOrder, then updatedAt)
  const packagesSorted = packages.sort((a: any, b: any) => {
    const sa = Number(a.sortOrder || 0);
    const sb = Number(b.sortOrder || 0);
    if (sa !== sb) return sa - sb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const cartPackages = await Promise.all(
    packagesSorted.map(async (pkg) => {
      const qty = cart.items[pkg.id] || 0;
      const itemsRaw = (() => {
        try {
          return JSON.parse(pkg.itemsJson || '[]');
        } catch {
          return [];
        }
      })();
      const items = await mapProductNames(itemsRaw);
      const deliveryDates = pkg.deliveryDatesJson ? (() => {
        try {
          return JSON.parse(pkg.deliveryDatesJson);
        } catch {
          return null;
        }
      })() : null;
      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        imageUrl: pkg.imageUrl,
        region: pkg.region,
        qty,
        items,
        deliveryDates,
        subtotal: Number.parseFloat(String(pkg.price)) * qty,
        originalSubtotal: pkg.originalPrice ? Number.parseFloat(String(pkg.originalPrice)) * qty : 0,
      };
    })
  );

  const allowedDeliveryDatesSet = new Set<string>();
  for (const p of cartPackages) {
    if (p.qty > 0 && p.deliveryDates && Array.isArray(p.deliveryDates)) {
      for (const d of p.deliveryDates) {
        if (d && String(d).trim()) allowedDeliveryDatesSet.add(String(d).trim());
      }
    }
  }
  const allowedDeliveryDates = Array.from(allowedDeliveryDatesSet).sort();

  const totals = cartPackages.reduce(
    (acc, p) => {
      acc.total += p.subtotal;
      acc.originalTotal += p.originalSubtotal;
      return acc;
    },
    { total: 0, originalTotal: 0 }
  );

  return res.render('public/cart', {
    cartPackages,
    allowedDeliveryDates,
    totals,
    phone,
    userEmail: user?.email || '',
    error: null,
    form: {},
  });
};

export const setCartFromSelection = (req: Request, res: Response) => {
  const cart = getCart(req);
  const items = (req.body && (req.body.items || req.body)) as any;

  const next: Record<string, number> = {};
  if (items && typeof items === 'object') {
    for (const [id, qty] of Object.entries(items)) {
      const q = normalizeQty(qty);
      if (q > 0) next[String(id)] = q;
    }
  }

  cart.items = next;
  return res.json({ success: true });
};

export const updateCartItem = (req: Request, res: Response) => {
  const cart = getCart(req);
  const packageId = String(req.body.packageId || '');
  const qty = normalizeQty(req.body.qty);
  if (!packageId) return res.status(400).json({ error: 'Missing packageId' });
  if (qty <= 0) delete cart.items[packageId];
  else cart.items[packageId] = qty;
  return res.json({ success: true });
};

export const clearCart = (req: Request, res: Response) => {
  const cart = getCart(req);
  cart.items = {};
  return res.json({ success: true });
};

export const checkoutCart = async (req: Request, res: Response) => {
  const cart = getCart(req);
  const ids = Object.keys(cart.items).filter((id) => cart.items[id] > 0);

  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  if (ids.length === 0) return res.redirect('/cart');

  const customerName = String(req.body.customerName || '').trim();
  const address = String(req.body.address || '').trim();
  const deliveryTime = String(req.body.deliveryTime || '').trim();
  const optionalNote = String(req.body.optionalNote || '').trim();

  if (!customerName || !address || !deliveryTime) {
    return res.status(400).send('Missing required fields.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  const phone = user?.phone || '';
  if (!phone) return res.status(400).send('Missing user phone.');

  const packages = await prisma.package.findMany({ where: { id: { in: ids }, isActive: true } });
  if (packages.length === 0) return res.redirect('/cart');

  // Validate deliveryTime against union of selected packages' delivery dates (same logic as order.ejs)
  const allowed = new Set<string>();
  for (const pkg of packages) {
    const qty = cart.items[pkg.id] || 0;
    if (qty <= 0) continue;
    if (pkg.deliveryDatesJson) {
      try {
        const dates = JSON.parse(pkg.deliveryDatesJson);
        if (Array.isArray(dates)) {
          for (const d of dates) if (d && String(d).trim()) allowed.add(String(d).trim());
        }
      } catch {
        // ignore
      }
    }
  }
  if (allowed.size > 0 && !allowed.has(deliveryTime)) {
    return res.status(400).send('Invalid delivery time.');
  }

  // Build order items (same pricing logic as old /order page)
  const items: any[] = [];
  let singlePackageId: string | null = null;
  const selectedCount = ids.length;
  if (selectedCount === 1) singlePackageId = ids[0];

  let orderRegion: string | null = null;
  if (singlePackageId) {
    const pkg = packages.find((p) => p.id === singlePackageId);
    orderRegion = pkg?.region || null;
  }

  for (const pkg of packages) {
    const qty = cart.items[pkg.id] || 0;
    if (qty <= 0) continue;

    let pkgItemsRaw: any[] = [];
    try {
      pkgItemsRaw = JSON.parse(pkg.itemsJson || '[]');
    } catch {
      pkgItemsRaw = [];
    }
    const pkgItems = await mapProductNames(pkgItemsRaw);
    const totalItemsInPkg = pkgItems.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
    const totalPkgPrice = Number.parseFloat(String(pkg.price));
    const pricePerItem = totalItemsInPkg > 0 ? totalPkgPrice / totalItemsInPkg : 0;

    for (const it of pkgItems) {
      items.push({
        title: `${pkg.name} - ${it.title}`,
        price: pricePerItem.toFixed(2),
        quantity: Number(it.quantity || 0) * qty,
        shopifyProductId: it.shopifyProductId,
        shopifyVariantId: it.shopifyVariantId,
      });
    }
  }

  const order = await prisma.order.create({
    data: {
      customerName,
      phone,
      address,
      deliveryTime,
      itemsJson: JSON.stringify(items),
      packageId: singlePackageId,
      region: orderRegion,
      paymentMethod: 'transfer', // chosen on payment page later
      paymentScreenshotPath: null,
      optionalNote: optionalNote || null,
      internalStatus: 'new',
      userId,
    },
  });

  // Clear cart after placing order
  cart.items = {};

  return res.redirect(`/payment?orderId=${encodeURIComponent(order.id)}`);
};

