# SachaBakes Order Management System

Responsive React + Supabase/Postgres + Node/Express OpenAI business app for SachaBakes.co.

## Included
- Dashboard: revenue, expenses, estimated COGS, projected gross profit, cash profit, pending orders and low-stock alerts.
- Orders: customer details, dispatch date, products, pricing, status, estimated cost/profit, automatic ingredient/packaging stock deduction and loyalty punch.
- Inventory: ingredients + packaging, base units, reorder levels and purchases. Purchases convert kg→g and l→ml correctly and record purchase spend.
- Recipe Book: recipe image, yield, ingredients, instructions, selling price, ingredient/packaging cost per piece, profit per piece and calculated price needed for a target margin.
- Menu & Price Card: upload a PNG/JPG/WEBP menu image to Supabase Storage, preview it, download it, or open a WhatsApp share flow containing the public menu link.
- Customers: automatically created/updated when an order is placed; searchable customer CRM with phone, address and birthday plus one-tap WhatsApp messaging.
- Loyalty: ₹250+ order punch logic, birthdays and downloadable loyalty-card PDFs.
- Expenses & Purchases: marketing, delivery, equipment, other expenses and inventory purchases.
- Ask Sacha AI: OpenAI-powered assistant with live inventory, orders and financial context.
- PWA/mobile responsive UI.

## Setup
1. Create a Supabase project.
2. Run the full `supabase/schema.sql` in Supabase SQL Editor. This includes the v2 customer, menu, recipe-pricing and storage additions.
3. Copy `.env.example` to `.env` and add your Supabase URL, publishable key and OpenAI API key.
4. Run `npm install` **once** on the machine where you are installing the project (or again only when dependencies change/delete node_modules).
5. For development, run `npm run dev`. This starts Vite + the AI server.
6. For a production frontend build, run `npm run build` once whenever you change frontend source and then deploy the generated `dist/` folder. You do NOT run `npm run build` every time you open the app.
7. For local use without Vite hot reload, the AI server still needs to be running: `npm run server`.

## Mobile use
The app is designed as a PWA. For real phone use, deploy the frontend to a public HTTPS host (for example Vercel/Netlify) and deploy the Express AI server to a server host. Keep Supabase as the cloud database/storage. Then open the HTTPS app URL on Android/iPhone and choose **Add to Home Screen / Install App**. It will use the same live database as desktop.

## WhatsApp
The current implementation uses WhatsApp's share/deep-link flow rather than the WhatsApp Business API. This lets you prefill a message and open WhatsApp without storing a WhatsApp access token in the browser. Direct automated sending without opening WhatsApp requires the official WhatsApp Business Platform/API and business setup.

## Important production security
The starter schema currently uses permissive policies for convenience. Before public deployment, add Supabase Auth and owner-scoped RLS policies. Do not expose the OpenAI API key in Vite/client environment variables; it belongs only on the Express server.

## Supabase + Authentication setup

1. In Supabase, create the project and keep **Data API enabled**. Automatic table exposure should remain disabled; automatic RLS can remain enabled.
2. In **SQL Editor**, paste and run `supabase/schema.sql` once. The final section hardens the starter policies so only authenticated users can access the business tables/functions. The storage bucket remains publicly readable so customer menu links work, while uploads/updates/deletes require authentication.
3. In Supabase **Authentication → Users**, create the first owner account manually. Do not add a public signup page.
4. Create a local `.env` file from `.env.example` and fill in the Supabase URL and publishable key. Never put a Supabase secret/service-role key in the frontend.
5. Run `npm install` once, then `npm run dev` for local development.
6. For production, deploy the Vite frontend to Vercel/Netlify/Cloudflare Pages and configure the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables there. The backend server needs its own deployment if Sacha AI is enabled; keep `OPENAI_API_KEY` server-side only.
7. In Supabase Authentication URL Configuration, add your deployed app URL to **Site URL**. If you later add password reset/email confirmation, add the corresponding deployed URL as a redirect URL.
8. After deployment, open the app on your phone and use the browser's **Add to Home Screen** option to install the PWA.

### Important security note
The initial development schema contained open `using (true)` policies. The final security-hardening section in `schema.sql` replaces them with `authenticated` policies. Run the complete file before using real business data.
