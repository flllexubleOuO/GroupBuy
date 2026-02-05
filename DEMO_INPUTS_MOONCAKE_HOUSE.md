# Demo Inputs (Service Booking / Group-buy Order / Custom Request)

This file is for **copy/paste during the live demo**. Focus: **Service Booking**, plus a complete **group-buy checkout** and a **custom request (user posts demand, merchant quotes)**.

---

### 0) Accounts & Entry Points

#### Merchant account (Moocake House)
- **Login**: `/login`
- **Email**：`merchant10@test.local`
- **Phone**：`0220000210`
- **Password**：`Test123456`
- **Merchant dashboard**: `/merchant/dashboard`
- **Quote hub (custom requests)**: `/service-booking/merchant`

#### Demo user account (for group-buy checkout / order lookup)
- **Login**: `/login`
- **Email**：`user1@test.local`
- **Phone**：`0220000010`
- **Password**：`Test123456`

#### Key pages
- **Service list**: `/service-booking`
- **Post a custom request**: `/service-booking/requests/new`
- **Group-buy order page**: `/order`
- **Cart / checkout**: `/cart`

---

### 1) Demo: Merchant publishes a service (Service Booking)

Path: login as **Moocake House** → open `/merchant/dashboard` → right-side form **Publish services**

#### Service #1 (recommended: “Custom flavor consultation”)
- **Name***:
  - `Mooncake House · Custom Mooncake Flavor Consultation (20 mins)`
- **Price (display)**:
  - `49.00`
- **Description** (paste as-is):

  Best for: Mid-Autumn gift box customization / corporate gifting / special occasions  
  We’ll recommend 3 package options based on your budget and taste preferences (incl. low-sugar and nut-free options).
  
  Included:
  - Flavor mix recommendations (classic / lava / tea / fruity)
  - Allergen notes & cross-contamination guidance (nut-free line available)
  - Gift box packaging & greeting card wording suggestions
  - Estimated lead time: 3–5 days after confirmation (subject to peak season)
  
  Note: you may upload a reference photo (moon cake style / packaging inspiration).

- **Duration (mins)**:
  - `20`
- **Image URL** (use built-in asset):
  - `/images/merchants/mooncake.png`
- **Time slots (JSON array)** (paste as-is):

```json
[
  "2026-02-10 10:00",
  "2026-02-10 14:00",
  "2026-02-11 11:00",
  "2026-02-11 16:30",
  "2026-02-12 09:30",
  "2026-02-12 18:00"
]
```

Optional (extra service for a quick second booking):
- **Name***: `Mooncake House · Tasting Box Pickup Appointment (10 mins)`
- **Price (display)**: `0`
- **Duration (mins)**: `10`
- **Time slots**: reuse the JSON above or switch to weekend slots

---

### 2) Demo: User books the service (Service Booking)

Path: open `/service-booking` → open the service detail → form **Book this service**

#### Booking form inputs
- **Name***: `Jin Demo`
- **Phone***: `0400 123 456`
- **Preferred time***: select `2026-02-10 10:00` (or any slot)
- **Reference image (optional)**: upload a mooncake/packaging photo if you want extra demo effect
- **Note (optional)** (paste as-is):

  Please make it low-sugar (about 30%–40% sweetness).  
  Family has peanut/nut allergies — please avoid cross-contamination.  
  Gift box: gold-foil text “Mid-Autumn Blessings”.  
  I can confirm the order before 2/18.

After submission you’ll land on the booking success page.

---

### 3) Demo: Group-buy package (merchant publishes + user checks out)

#### 3.1 Merchant publishes a group-buy package (Moocake House)
Path: `/merchant/dashboard` → left-side form **Publish group-buy packages**

- **Name***:
  - `Mooncake House Mid‑Autumn Deal | 6‑piece Mixed Gift Box (Low‑sugar option)`
- **Group-buy price***:
  - `59.90`
- **Original price (optional)**:
  - `79.90`
- **Region** (pick one for filtering):
  - `North Shore`
- **Delivery dates (JSON array)** (paste as-is; used at checkout dropdown):

```json
[
  "2026-02-18 下午",
  "2026-02-19 上午",
  "2026-02-20 下午"
]
```

- **Description** (paste as-is):

  6-piece mixed flavor gift box (about 60g each), great for 2–3 people.  
  Low-sugar version available (leave “low sugar” in the order note).
  
  Flavors (example):
  - Classic lotus + salted egg yolk ×2
  - Lava custard ×2
  - Matcha red bean ×2

- **Image URL**:
  - `/images/merchants/mooncake.png`
- **Advanced fields → itemsJson** (paste as-is; so “Items included” shows content):

```json
[
  { "shopifyProductId": "900000000001", "shopifyVariantId": "900000000101", "title": "经典莲蓉蛋黄月饼（2粒）", "price": "0", "quantity": 2 },
  { "shopifyProductId": "900000000002", "shopifyVariantId": "900000000201", "title": "流心奶黄月饼（2粒）", "price": "0", "quantity": 2 },
  { "shopifyProductId": "900000000003", "shopifyVariantId": "900000000301", "title": "抹茶红豆月饼（2粒）", "price": "0", "quantity": 2 }
]
```

Keep **Publish immediately** checked.

#### 3.2 User checkout inputs (User 1)
Path: login as **User 1** → `/order` add to cart → `/cart` checkout → `/payment`

In `/cart` checkout form:
- **Name***: `Jin Demo`
- **Delivery address***:

  Unit 1203, 1 Help St  
  Chatswood NSW 2067

- **Delivery time***: select `2026-02-18 下午`
- **Note (optional)** (paste as-is):

  Please make it low-sugar (30%–40% sweetness).  
  Avoid peanut/nut cross-contamination.  
  Text me on arrival — leave at the door if possible.

In `/payment`:
- **Payment method**: choose `Cash on delivery` (fastest for demo, no upload)

---

### 4) Demo: User posts a custom request (special flavors) + merchant quotes

#### 4.1 User posts the request (recommended: logged in as User 1)
Path: `/service-booking/requests/new`

Form inputs:
- **Your name***: `Jin Demo`
- **Phone***: `0400 123 456`
- **Service type***: select `Other`
- **Title (optional)**:
  - `Custom mooncake gift boxes (low-sugar / nut-free) — 12 boxes`
- **Describe your needs*** (paste as-is):

  Request: 12 custom Mid‑Autumn gift boxes (6 pieces per box) for corporate gifting.  
  
  Flavor preferences (please include as many “special flavors” as possible):
  - Matcha red bean
  - Earl Grey lava custard
  - Lychee rose
  - Black sesame lava
  - Taro mochi
  - Low-sugar lotus + salted egg yolk
  
  Allergies / constraints:
  - Peanut/nut allergy — please offer nut-free option and minimize cross-contamination
  - Sweetness: ~30%–40% (low sugar)
  
  Packaging & message:
  - Deep blue gift box + gold-foil “Mid-Autumn Blessings”
  - Add a small card in each box (optional bilingual message)
  
  Delivery:
  - Prefer delivery/pickup before `2026-02-18 下午`
  
  Budget:
  - $55–$65 per box (flexible based on packaging/flavors)

- **Address (optional)**: `Chatswood NSW 2067`
- **Preferred time (optional)**: `2026-02-16 ~ 2026-02-18 下午`
- **Reference image (optional)**: upload a preferred mooncake/packaging photo for a nicer demo

After submitting, you’ll be redirected to the request detail page.

#### 4.2 Merchant (Moocake House) submits a quote
Path: merchant login → `/service-booking/merchant` → open the request → fill quote form

Quote form inputs (example pricing for all 12 boxes):
- **Price***：`768.00`
- **Details (optional)** (paste as-is):

  Includes:
  - 12 boxes × 6-piece mixed flavor set (incl. 3–4 special flavors)
  - Low-sugar version (~35% sweetness)
  - Nut-free line prioritized (to reduce cross-contamination risk)
  - Deep blue gift box + gold-foil text “Mid-Autumn Blessings”
  
  Delivery notes:
  - Deliverable to North Shore by `2026-02-18 下午` (other regions: please confirm)
  - Optional bilingual cards: +$1.00 per box

- **Contact info (optional)** (paste/edit):

  Phone: 0220000210  
  WeChat: moocake_house  
  Email: merchant10@test.local

After submitting, switch back to the user’s request detail page to show the quote.

---

### 5) Recommended demo setup (fast switching)
- **Browser A (Merchant)**: Moocake House (publish service / publish package / quote)
- **Browser B (User)**: User 1 (book service / checkout / post request / view quote)

