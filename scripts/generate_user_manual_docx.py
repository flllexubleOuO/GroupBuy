from __future__ import annotations

import html
import os
import zipfile
from dataclasses import dataclass
from datetime import date


NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def _xml_escape(s: str) -> str:
    return html.escape(s, quote=False)


@dataclass(frozen=True)
class Run:
    text: str
    bold: bool = False
    color: str | None = None  # hex like "FF0000"


@dataclass(frozen=True)
class Paragraph:
    runs: list[Run]
    style: str | None = None  # e.g. "Heading1"
    # Numbering: if set, the paragraph will use numbering.xml definitions
    num_id: int | None = None
    ilvl: int | None = None
    # Structural: page break before this paragraph
    page_break_before: bool = False


def _run_xml(run: Run) -> str:
    # Preserve line breaks inside a run using <w:br/>
    parts: list[str] = []
    for idx, line in enumerate(run.text.split("\n")):
        if idx > 0:
            parts.append("<w:br/>")
        if line:
            parts.append(f"<w:t xml:space=\"preserve\">{_xml_escape(line)}</w:t>")
        else:
            parts.append("<w:t xml:space=\"preserve\"> </w:t>")

    rpr = []
    if run.bold:
        rpr.append("<w:b/>")
    if run.color:
        rpr.append(f"<w:color w:val=\"{run.color}\"/>")
    rpr_xml = f"<w:rPr>{''.join(rpr)}</w:rPr>" if rpr else ""

    return f"<w:r>{rpr_xml}{''.join(parts)}</w:r>"


def _p_xml(p: Paragraph) -> str:
    ppr_parts: list[str] = []
    if p.style:
        ppr_parts.append(f"<w:pStyle w:val=\"{_xml_escape(p.style)}\"/>")
    if p.page_break_before:
        ppr_parts.append("<w:pageBreakBefore/>")
    if p.num_id is not None and p.ilvl is not None:
        ppr_parts.append(
            f"<w:numPr><w:ilvl w:val=\"{int(p.ilvl)}\"/><w:numId w:val=\"{int(p.num_id)}\"/></w:numPr>"
        )

    ppr_xml = f"<w:pPr>{''.join(ppr_parts)}</w:pPr>" if ppr_parts else ""
    runs_xml = "".join(_run_xml(r) for r in p.runs) if p.runs else "<w:r><w:t xml:space=\"preserve\"> </w:t></w:r>"
    return f"<w:p>{ppr_xml}{runs_xml}</w:p>"


def _toc_field_paragraph() -> Paragraph:
    # A simple TOC field that Word can update: References -> Update Table
    # It will show headings 1-3. Word may require user to "Update Field" once.
    fld = (
        "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r>"
        "<w:r><w:instrText xml:space=\"preserve\"> TOC \\\\o \"1-3\" \\\\h \\\\z \\\\u </w:instrText></w:r>"
        "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>"
        "<w:r><w:t>Right-click and choose “Update Field” to generate the Table of Contents.</w:t></w:r>"
        "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>"
    )
    return Paragraph(runs=[Run(text="")], style="Normal")  # placeholder; we will inject raw runs via special case


def red_note(text: str) -> Paragraph:
    return Paragraph(runs=[Run(text=f"[SCREENSHOT REQUIRED] {text}", bold=True, color="FF0000")], style="ScreenshotNote")


def h1(text: str, *, page_break_before: bool = False) -> Paragraph:
    return Paragraph(runs=[Run(text=text, bold=True)], style="Heading1", page_break_before=page_break_before)


def h2(text: str) -> Paragraph:
    return Paragraph(runs=[Run(text=text, bold=True)], style="Heading2")


def h3(text: str) -> Paragraph:
    return Paragraph(runs=[Run(text=text, bold=True)], style="Heading3")


def p(text: str) -> Paragraph:
    return Paragraph(runs=[Run(text=text)], style="Normal")


def bullet(text: str, *, level: int = 0) -> Paragraph:
    # numId=1 is bullet list
    return Paragraph(runs=[Run(text=text)], style="ListParagraph", num_id=1, ilvl=level)


def step(text: str, *, level: int = 0) -> Paragraph:
    # numId=2 is numbered steps
    return Paragraph(runs=[Run(text=text)], style="ListParagraph", num_id=2, ilvl=level)


def build_document_paragraphs() -> list[Paragraph]:
    today = date.today().isoformat()
    paragraphs: list[Paragraph] = []

    # Cover
    paragraphs += [
        Paragraph(runs=[Run(text="GROUPBUY SYSTEM", bold=True)], style="Title"),
        Paragraph(runs=[Run(text="User Manual", bold=True)], style="Subtitle"),
        p(""),
        p("Project: WeChat GroupBuy System (GroupBuy)"),
        p("Version: 1.0.0"),
        p(f"Date: {today}"),
        p(""),
        red_note("Insert a screenshot of the system home page (/home)."),
        p(""),
        h1("Table of Contents", page_break_before=True),
        # TOC placeholder (Word field)
        Paragraph(runs=[Run(text="(Table of Contents field placeholder)")] , style="Normal"),
        p(""),
        h1("1. Overview", page_break_before=True),
        p("This document explains how each user role can use the GroupBuy system. It is written as an instruction manual."),
        p("Main modules:"),
        bullet("Group Buying: select packages → add to cart → checkout → payment proof upload → track order status"),
        bullet("Merchant Center: maintain store profile, publish packages/services, submit quotes for custom requests"),
        bullet("Admin Console: manage orders, manage packages, maintain product name translations, print orders, route planning"),
        bullet("Service Booking: book standard services, or post a custom request and receive private merchant quotes"),
        p(""),
        h2("1.1 User roles in this system"),
        bullet("USER (Buyer): register/login, place group-buy orders, submit payment, view orders, book services, post custom requests"),
        bullet("MERCHANT: everything a USER can do + store management, publish packages/services, quote on custom requests"),
        bullet("ADMIN: order/package/product-translation management and operational tools (printing, route planning)"),
        p(""),
        h1("2. Getting Started", page_break_before=True),
        h2("2.1 Recommended environment"),
        bullet("Recommended browsers: WeChat in-app browser (H5), Chrome / Safari (desktop is also supported)"),
        bullet("Recommended usage: mobile for ordering; desktop for merchant/admin dashboards"),
        p(""),
        h2("2.2 Key URLs (default local port: 3000)"),
        bullet("Home: /home"),
        bullet("Group-buy ordering: /order"),
        bullet("Cart: /cart (login required)"),
        bullet("My orders: /query-order (login required)"),
        bullet("User/Merchant login: /login"),
        bullet("Register: /register"),
        bullet("My account: /account (login required)"),
        bullet("Merchant dashboard: /merchant/dashboard (merchant role required)"),
        bullet("Admin login: /admin-login"),
        bullet("Admin orders: /admin/orders"),
        bullet("Service booking: /service-booking"),
        bullet("Post custom request: /service-booking/requests/new"),
        bullet("Merchant quote hub: /service-booking/merchant (legacy links may require ?key=...)"),
        p(""),
        h2("2.3 Demo accounts (if seed data is loaded)"),
        p("Default password for all demo accounts: Test123456"),
        bullet("Admin (ADMIN): admin1@test.local / admin2@test.local"),
        bullet("Users (USER): user1@test.local to user5@test.local"),
        bullet("Merchants (MERCHANT): merchant1@test.local to merchant10@test.local"),
        red_note("If your submission requires real accounts, replace the demo credentials above with your actual test accounts."),
        p(""),
    ]

    # USER manual
    paragraphs += [
        h1("3. USER (Buyer) Instructions", page_break_before=True),
        h2("3.1 Register an account"),
        step("Open the registration page: /register"),
        step("Fill in Email, Phone, and Password (at least 6 characters)."),
        step("Click “Register & Login”. After success, you will be logged in automatically."),
        red_note("Insert a screenshot of the Register page (/register)."),
        p(""),
        h2("3.2 Log in / log out"),
        step("Open the login page: /login"),
        step("In “Email / Phone”, enter your email or phone, then enter your password."),
        step("Click “Login”."),
        step("To log out, open /account and click “Logout”."),
        red_note("Insert a screenshot of the Login page (/login)."),
        red_note("Insert a screenshot of the My Account page showing the Logout button (/account)."),
        p(""),
        h2("3.3 Select packages and add to cart"),
        step("Open the group-buy page: /order"),
        step("Use “Search packages...” and/or “Region” to filter packages."),
        step("Use “+ / -” to change quantity, then click “Add to cart”."),
        step("Click “Go to cart” to proceed to /cart."),
        red_note("Insert a screenshot of /order showing filters, quantity controls, and “Add to cart / Go to cart”."),
        p(""),
        h2("3.4 Review cart and adjust items"),
        step("Open the cart page: /cart (login required)."),
        step("Use “+ / -” to adjust quantity; click “Remove” to remove an item."),
        step("Click “Clear cart” to empty the entire cart."),
        red_note("Insert a screenshot of /cart showing quantity controls, Remove, and Clear cart."),
        p(""),
        h2("3.5 Checkout (place an order)"),
        step("In the Checkout panel, fill in Name, Delivery address, and Delivery time (required)."),
        step("Optionally fill in Note."),
        step("Click “Place order → Pay”. The system will create the order and redirect to the payment page."),
        p("Note: Delivery time options are derived from the selected packages’ configured delivery dates. If no options exist, the order cannot be submitted."),
        red_note("Insert a screenshot of the Checkout form on /cart (Name/Address/Delivery time/Place order → Pay)."),
        p(""),
        h2("3.6 Payment and payment proof"),
        step("On /payment, review the order summary."),
        step("Choose a payment method: Bank transfer or Cash on delivery."),
        step("If Bank transfer is selected: upload “Payment proof” (image) and click “Submit payment”."),
        step("After submission, you will be redirected to /success."),
        red_note("Insert a screenshot of /payment showing payment method and payment proof upload."),
        red_note("Insert a screenshot of the success page (/success)."),
        p(""),
        h2("3.7 View your orders and status"),
        step("Open “My Orders”: /query-order (login required)."),
        step("Review the order status (New / Payment confirmed / Preparing / Out for delivery / Completed / Cancelled) and details."),
        step("If you used Bank transfer, the uploaded payment proof will be displayed in the order card."),
        red_note("Insert a screenshot of /query-order showing status and the payment proof image."),
        p(""),
    ]

    # Merchant
    paragraphs += [
        h1("4. MERCHANT Instructions", page_break_before=True),
        h2("4.1 Log in as a merchant"),
        step("Open /login (users and merchants share the same login page)."),
        step("Log in with a merchant account and open /account."),
        step("Confirm your Role shows MERCHANT."),
        red_note("Insert a screenshot of /account showing Role: MERCHANT."),
        p(""),
        h2("4.2 Upgrade a normal user to MERCHANT (if needed)"),
        step("After logging in, open /merchant/upgrade."),
        step("Fill in Store name (required) and other optional fields."),
        step("Click “Upgrade”. Then open /merchant/dashboard."),
        red_note("Insert a screenshot of the Upgrade to Merchant page (/merchant/upgrade)."),
        p(""),
        h2("4.3 Maintain store profile"),
        step("Open the Merchant Dashboard: /merchant/dashboard."),
        step("In “Store profile”, update store details (name, contact, phone, email, WeChat, hours, address, description)."),
        step("Upload “Store promo image” or fill “Store promo image URL”, then click “Save profile”."),
        red_note("Insert a screenshot of Merchant Dashboard → Store profile (/merchant/dashboard)."),
        p(""),
        h2("4.4 Publish group-buy packages (merchant simplified flow)"),
        p("Note: Admin Console provides the full package builder (select product/variant). Merchant Dashboard supports basic fields plus an advanced itemsJson field."),
        step("On /merchant/dashboard, under “Publish group-buy packages”, fill in Name and Group-buy price (required)."),
        step("Optionally fill Description, Region, and upload an Image or provide an Image URL."),
        step("If you need to define package items, edit “itemsJson” in Advanced fields (JSON array)."),
        step("Click “Create package”. Use “View” to open details or “Delete” to remove a package."),
        red_note("Insert a screenshot of the package creation form (/merchant/dashboard → Publish group-buy packages)."),
        red_note("Insert a screenshot of the merchant package list (showing View/Delete)."),
        p(""),
        h2("4.5 Publish services (for Service Booking)"),
        step("On /merchant/dashboard, under “Publish services”, fill in Name (required)."),
        step("Optionally fill Price, Description, Duration (mins), and upload an Image or provide an Image URL."),
        step("If you want pre-defined booking slots, fill “Time slots (JSON array)”."),
        step("Click “Create service”. Use “View” to open details or “Delete” to remove a service."),
        red_note("Insert a screenshot of the service creation form (/merchant/dashboard → Publish services)."),
        p(""),
        h2("4.6 Quote on custom service requests"),
        step("Open the quote hub: /service-booking/merchant (legacy links may require ?key=...)."),
        step("Click an open request to view details."),
        step("Fill in Price (required), optional Details and Contact info, then click “Submit quote”."),
        step("The user can select your quote. There is no in-app chat; users contact you via the info you provided."),
        red_note("Insert a screenshot of the merchant quote hub list (/service-booking/merchant)."),
        red_note("Insert a screenshot of the request detail + quote form (/service-booking/merchant/requests/:id)."),
        p(""),
    ]

    # Admin
    paragraphs += [
        h1("5. ADMIN Instructions", page_break_before=True),
        h2("5.1 Admin login / logout"),
        step("Open /admin-login."),
        step("Enter Username and Password, then click “Login”."),
        step("To log out, click “Logout/退出登录” in the admin pages header."),
        red_note("Insert a screenshot of the Admin Login page (/admin-login)."),
        p(""),
        h2("5.2 Order management"),
        step("Open /admin/orders."),
        step("Filter by status, region, delivery date, or phone number, then click “Search/搜索”."),
        step("Click “View details/查看详情” to open an order detail page."),
        step("On the detail page, click “Print/打印订单” to print."),
        step("Update the order status under “Update order status/更新订单状态”, then click “Save/保存”."),
        step("Delete orders from the list or detail page (may also delete the Shopify order)."),
        red_note("Insert a screenshot of /admin/orders showing filters and the order list."),
        red_note("Insert a screenshot of /admin/orders/:id showing print, payment proof, and status update."),
        p(""),
        h2("5.3 Route planning (Google Maps)"),
        step("On /admin/orders, filter by Region and Delivery date so the list contains orders."),
        step("Click “Route planning/路线规划” to open the modal."),
        step("Click “Open in Google Maps/在 Google Maps 中打开路线规划”."),
        red_note("Insert a screenshot of the route planning modal (/admin/orders → Route planning)."),
        p(""),
        h2("5.4 Package management"),
        step("Open /admin/packages."),
        step("Click “Create package/创建套餐”, then fill required fields (name, price, region, items)."),
        step("Optionally configure delivery dates and time slot (All day / Morning / Afternoon)."),
        step("Add items by selecting product + variant and quantity, then click “Add item/添加商品”."),
        step("Click “Save/保存”. Use Edit/Enable/Disable/Delete on package cards."),
        red_note("Insert a screenshot of /admin/packages."),
        red_note("Insert a screenshot of the Create/Edit package modal (delivery dates + item selection)."),
        p(""),
        h2("5.5 Product translation mapping"),
        step("Open /admin/product-mappings."),
        step("Click “Sync products from Shopify/从 Shopify 同步商品”."),
        step("Fill Chinese translations and click “Save/保存” per row, or “Save all/保存所有翻译”."),
        step("Use the search box to find products by English or Chinese name."),
        red_note("Insert a screenshot of /admin/product-mappings."),
        p(""),
    ]

    # Service booking
    paragraphs += [
        h1("6. Service Booking (User side)", page_break_before=True),
        h2("6.1 Book a standard service"),
        step("Open /service-booking and select a service."),
        step("On the service detail page, fill Name, Phone, and Preferred time (required)."),
        step("Optionally upload a Reference image and fill Note."),
        step("Click “Submit booking”, then record the Booking ID on the success page."),
        red_note("Insert a screenshot of the service list (/service-booking)."),
        red_note("Insert a screenshot of the service detail + booking form (/service-booking/services/:id)."),
        red_note("Insert a screenshot of booking success (/service-booking/bookings/:id/success)."),
        p(""),
        h2("6.2 Post a custom request and select a quote"),
        step("Open /service-booking/requests/new."),
        step("Fill required fields (Your name, Phone, Service type, Description), plus optional fields."),
        step("Click “Publish request”."),
        step("Open the generated request detail page and review private quotes."),
        step("Click “Select this quote” on the quote you choose."),
        red_note("Insert a screenshot of the custom request form (/service-booking/requests/new)."),
        red_note("Insert a screenshot of the quote list and selection button (/service-booking/requests/:id?token=...)."),
        p(""),
    ]

    # FAQ + checklist
    paragraphs += [
        h1("7. FAQ", page_break_before=True),
        bullet("Why can’t I see my orders? The “My Orders” page only shows orders tied to the currently logged-in account phone number."),
        bullet("Why can’t I submit Bank transfer payment? Bank transfer requires uploading an image as payment proof (≤ 5MB)."),
        bullet("Why is Delivery time empty at checkout? The selected packages have no delivery dates configured. Ask an admin to configure delivery dates in Package Management."),
        bullet("Why can’t I access /merchant/dashboard? Your account must have MERCHANT role. Upgrade at /merchant/upgrade."),
        bullet("Why are there no services to book? A merchant must publish services first (or add seed data / use Prisma Studio)."),
        p(""),
        h1("8. Screenshot Checklist", page_break_before=True),
        p("Use this checklist to ensure all required screenshots are included in your submission:"),
        bullet("Home: /home"),
        bullet("Register: /register"),
        bullet("Login: /login"),
        bullet("My account: /account (show role + Logout)"),
        bullet("Group-buy ordering: /order (filters + Add to cart + Go to cart)"),
        bullet("Cart + checkout form: /cart"),
        bullet("Payment + upload proof: /payment"),
        bullet("Success page: /success"),
        bullet("My orders: /query-order"),
        bullet("Merchant upgrade: /merchant/upgrade (if applicable)"),
        bullet("Merchant dashboard: /merchant/dashboard (profile + publish package/service)"),
        bullet("Merchant quote hub: /service-booking/merchant (list + quote detail)"),
        bullet("Admin login: /admin-login"),
        bullet("Admin orders: /admin/orders (filters + route planning)"),
        bullet("Admin order detail: /admin/orders/:id (print + status update)"),
        bullet("Admin packages: /admin/packages (create/edit modal)"),
        bullet("Admin product mappings: /admin/product-mappings"),
        bullet("Service booking list: /service-booking"),
        bullet("Service booking detail: /service-booking/services/:id"),
        bullet("Booking success: /service-booking/bookings/:id/success"),
        bullet("Custom request form: /service-booking/requests/new"),
        bullet("User request detail: /service-booking/requests/:id?token=..."),
        p(""),
        red_note("Before submission: ensure every red “[SCREENSHOT REQUIRED]” note has been replaced by a real screenshot."),
    ]

    return paragraphs


def build_docx_bytes() -> dict[str, bytes]:
    paragraphs = build_document_paragraphs()

    # Special case: we want a real field for TOC. Since we don’t have a full XML object model,
    # inject it as a raw paragraph after "Table of Contents" title (the next paragraph currently is placeholder).
    body_xml_parts: list[str] = []
    toc_injected = False
    for pp in paragraphs:
        # Replace our placeholder text with the TOC field paragraph once.
        if (not toc_injected) and pp.style == "Normal" and len(pp.runs) == 1 and pp.runs[0].text == "(Table of Contents field placeholder)":
            toc_injected = True
            body_xml_parts.append(
                "<w:p><w:pPr><w:pStyle w:val=\"Normal\"/></w:pPr>"
                "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r>"
                "<w:r><w:instrText xml:space=\"preserve\"> TOC \\\\o \"1-3\" \\\\h \\\\z \\\\u </w:instrText></w:r>"
                "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>"
                "<w:r><w:t xml:space=\"preserve\">Right-click and choose “Update Field” to generate the Table of Contents.</w:t></w:r>"
                "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>"
                "</w:p>"
            )
            continue
        body_xml_parts.append(_p_xml(pp))

    body_xml = "".join(body_xml_parts)

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{NS_W}" xmlns:r="{NS_R}">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""

    styles_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{NS_W}">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="240"/></w:pPr>
    <w:rPr><w:sz w:val="32"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="360" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="280" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="200" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ScreenshotNote">
    <w:name w:val="Screenshot Note"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="120" w:after="120"/>
      <w:shd w:val="clear" w:color="auto" w:fill="FFF2F2"/>
      <w:ind w:left="360"/>
    </w:pPr>
    <w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr>
  </w:style>
</w:styles>
"""

    numbering_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="{NS_W}">
  <!-- Bullet list (numId=1) -->
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="o"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1080" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>

  <!-- Numbered steps (numId=2) -->
  <w:abstractNum w:abstractNumId="2">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1080" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>
"""

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"""

    return {
        "[Content_Types].xml": content_types.encode("utf-8"),
        "_rels/.rels": rels.encode("utf-8"),
        "word/document.xml": document_xml.encode("utf-8"),
        "word/styles.xml": styles_xml.encode("utf-8"),
        "word/numbering.xml": numbering_xml.encode("utf-8"),
        "word/_rels/document.xml.rels": doc_rels.encode("utf-8"),
    }


def write_docx(out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    parts = build_docx_bytes()
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in parts.items():
            z.writestr(name, data)


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out1 = os.path.join(repo_root, "User Manual.docx")
    out2 = os.path.join(repo_root, "2.3 User Manual.docx")
    write_docx(out1)
    write_docx(out2)
    print(f"Wrote: {out1}")
    print(f"Wrote: {out2}")


if __name__ == "__main__":
    main()

