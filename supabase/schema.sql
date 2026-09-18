create extension if not exists pgcrypto;

create table if not exists inventory_items(
 id uuid primary key default gen_random_uuid(), name text not null, category text not null check(category in ('ingredient','packaging','other')),
 quantity numeric not null default 0, unit text not null, reorder_level numeric not null default 0, cost_per_unit numeric not null default 0,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists recipes(
 id uuid primary key default gen_random_uuid(), name text not null, yield_qty numeric not null, yield_unit text not null,
 instructions text, image_url text, created_at timestamptz default now()
);
create table if not exists recipe_ingredients(
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references recipes(id) on delete cascade,
 inventory_item_id uuid not null references inventory_items(id), quantity numeric not null, unit text not null
);
create table if not exists orders(
 id uuid primary key default gen_random_uuid(), order_number bigserial unique, customer_name text not null, phone text not null,
 address text, placed_at timestamptz not null default now(), dispatch_at timestamptz, total numeric not null default 0,
 status text not null default 'pending' check(status in ('pending','confirmed','baking','ready','dispatched','delivered','cancelled')),
 notes text, created_at timestamptz default now()
);
create table if not exists order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
 product_id uuid references recipes(id), quantity numeric not null default 1
);
create table if not exists purchases(
 id uuid primary key default gen_random_uuid(), inventory_item_id uuid not null references inventory_items(id), quantity numeric not null,
 unit_cost numeric not null, total_cost numeric not null, purchased_at timestamptz default now(), notes text
);
create table if not exists expenses(
 id uuid primary key default gen_random_uuid(), category text not null, description text not null, amount numeric not null,
 spent_at date not null default current_date, created_at timestamptz default now()
);
create table if not exists loyalty_cards(
 id uuid primary key default gen_random_uuid(), customer_name text not null, phone text not null unique, email text, birthday date,
 punches int not null default 0 check(punches between 0 and 5), reward_redeemed boolean not null default false, created_at timestamptz default now()
);

alter table inventory_items enable row level security; alter table recipes enable row level security; alter table recipe_ingredients enable row level security;
alter table orders enable row level security; alter table order_items enable row level security; alter table purchases enable row level security; alter table expenses enable row level security; alter table loyalty_cards enable row level security;

do $$ begin create policy "owner access inventory" on inventory_items for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access recipes" on recipes for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access recipe ingredients" on recipe_ingredients for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access orders" on orders for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access order items" on order_items for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access purchases" on purchases for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access expenses" on expenses for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner access loyalty" on loyalty_cards for all using (true) with check (true); exception when duplicate_object then null; end $$;

create or replace function normalize_qty(p_qty numeric,p_from text,p_to text) returns numeric language plpgsql immutable as $$
begin
 if lower(p_from)=lower(p_to) then return p_qty; end if;
 if lower(p_from)='kg' and lower(p_to)='g' then return p_qty*1000; end if;
 if lower(p_from)='g' and lower(p_to)='kg' then return p_qty/1000; end if;
 if lower(p_from)='l' and lower(p_to)='ml' then return p_qty*1000; end if;
 if lower(p_from)='ml' and lower(p_to)='l' then return p_qty/1000; end if;
 raise exception 'Incompatible units: % and %',p_from,p_to;
end;$$;

create or replace view recipe_costs as
select r.id as recipe_id,r.name,r.yield_qty,r.yield_unit,
 coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0) as batch_cost,
 case when r.yield_qty>0 then coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0)/r.yield_qty else 0 end as cost_per_yield
from recipes r left join recipe_ingredients ri on ri.recipe_id=r.id left join inventory_items i on i.id=ri.inventory_item_id
group by r.id,r.name,r.yield_qty,r.yield_unit;

create or replace view order_financials as
select o.id,o.order_number,o.customer_name,o.phone,o.placed_at,o.dispatch_at,o.total,o.status,
 coalesce(sum(rc.cost_per_yield*oi.quantity),0) as estimated_cost,
 o.total-coalesce(sum(rc.cost_per_yield*oi.quantity),0) as estimated_gross_profit
from orders o left join order_items oi on oi.order_id=o.id left join recipe_costs rc on rc.recipe_id=oi.product_id
group by o.id,o.order_number,o.customer_name,o.phone,o.placed_at,o.dispatch_at,o.total,o.status;

create or replace function record_purchase(p_inventory_item_id uuid,p_quantity numeric,p_unit_cost numeric,p_total_cost numeric,p_notes text default '',p_purchase_unit text default null) returns void language plpgsql security definer as $$
declare inv record; normalized_qty numeric; normalized_unit_cost numeric; begin
 if p_quantity<=0 or p_unit_cost<0 or p_total_cost<0 then raise exception 'Purchase values must be valid positive amounts'; end if;
 select * into inv from inventory_items where id=p_inventory_item_id for update;
 if not found then raise exception 'Inventory item not found'; end if;
 normalized_qty := normalize_qty(p_quantity,coalesce(p_purchase_unit,inv.unit),inv.unit);
 normalized_unit_cost := case when normalized_qty>0 then p_total_cost/normalized_qty else 0 end;
 insert into purchases(inventory_item_id,quantity,unit_cost,total_cost,notes) values(p_inventory_item_id,normalized_qty,normalized_unit_cost,p_total_cost,p_notes);
 update inventory_items set quantity=quantity+normalized_qty,cost_per_unit=normalized_unit_cost,updated_at=now() where id=p_inventory_item_id;
 insert into expenses(category,description,amount) values('inventory purchase','Purchase: '||inv.name,p_total_cost);
end;$$;

create or replace function place_order(p_customer_name text,p_phone text,p_address text,p_placed_at timestamptz,p_dispatch_at timestamptz,p_total numeric,p_notes text,p_items jsonb,p_birthday date default null) returns uuid language plpgsql security definer as $$
declare oid uuid; item jsonb; ri record; needed numeric; available numeric; begin
 if p_total<0 then raise exception 'Order total cannot be negative'; end if;
 insert into orders(customer_name,phone,address,placed_at,dispatch_at,total,notes) values(p_customer_name,p_phone,p_address,p_placed_at,p_dispatch_at,p_total,p_notes) returning id into oid;
 for item in select * from jsonb_array_elements(p_items) loop
   if (item->>'quantity')::numeric<=0 then raise exception 'Order quantity must be positive'; end if;
   insert into order_items(order_id,product_id,quantity) values(oid,(item->>'product_id')::uuid,(item->>'quantity')::numeric);
   for ri in select ri.*,r.yield_qty,i.name,i.unit as inventory_unit,i.quantity as available from recipe_ingredients ri join recipes r on r.id=ri.recipe_id join inventory_items i on i.id=ri.inventory_item_id where ri.recipe_id=(item->>'product_id')::uuid loop
     needed := normalize_qty(ri.quantity,ri.unit,ri.inventory_unit) / ri.yield_qty * (item->>'quantity')::numeric;
     if ri.available < needed then raise exception 'Not enough %: need %, have %',ri.name,round(needed,2),round(ri.available,2); end if;
     update inventory_items set quantity=quantity-needed,updated_at=now() where id=ri.inventory_item_id;
   end loop;
 end loop;
 if p_total >= 250 then
   insert into loyalty_cards(customer_name,phone,birthday,punches)
   values(p_customer_name,p_phone,p_birthday,1)
   on conflict(phone) do update set customer_name=excluded.customer_name,birthday=coalesce(excluded.birthday,loyalty_cards.birthday),punches=least(5,loyalty_cards.punches+case when loyalty_cards.punches<5 and not loyalty_cards.reward_redeemed then 1 else 0 end);
 end if;
 return oid;
end;$$;

grant execute on function record_purchase(uuid,numeric,numeric,numeric,text,text) to anon,authenticated;
grant execute on function place_order(text,text,text,timestamptz,timestamptz,numeric,text,jsonb,date) to anon,authenticated;

-- SachaBakes v2: customer CRM, menu assets and recipe pricing
create table if not exists customers(
 id uuid primary key default gen_random_uuid(), customer_name text not null, phone text not null unique,
 email text, address text, birthday date, notes text, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table customers enable row level security;
do $$ begin create policy "owner access customers" on customers for all using (true) with check (true); exception when duplicate_object then null; end $$;

alter table recipes add column if not exists selling_price numeric not null default 0;
alter table recipes add column if not exists target_margin_pct numeric not null default 50;

create table if not exists menu_assets(
 id uuid primary key default gen_random_uuid(), title text not null, file_url text not null,
 created_at timestamptz default now(), is_active boolean not null default true
);
alter table menu_assets enable row level security;
do $$ begin create policy "owner access menu assets" on menu_assets for all using (true) with check (true); exception when duplicate_object then null; end $$;

insert into storage.buckets (id,name,public) values ('sachabakes-assets','sachabakes-assets',true) on conflict (id) do nothing;
do $$ begin
 create policy "public read SachaBakes assets" on storage.objects for select using (bucket_id='sachabakes-assets');
 create policy "upload SachaBakes assets" on storage.objects for insert with check (bucket_id='sachabakes-assets');
 create policy "update SachaBakes assets" on storage.objects for update using (bucket_id='sachabakes-assets') with check (bucket_id='sachabakes-assets');
 create policy "delete SachaBakes assets" on storage.objects for delete using (bucket_id='sachabakes-assets');
exception when duplicate_object then null; end $$;

create or replace view recipe_costs as
select r.id as recipe_id,r.name,r.yield_qty,r.yield_unit,r.selling_price,r.target_margin_pct,
 coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0) as batch_cost,
 case when r.yield_qty>0 then coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0)/r.yield_qty else 0 end as cost_per_yield,
 case when r.yield_qty>0 and (100-r.target_margin_pct)>0 then
   (coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0)/r.yield_qty)/(1-r.target_margin_pct/100)
 else 0 end as price_for_target_margin,
 case when r.yield_qty>0 then r.selling_price-(coalesce(sum(normalize_qty(ri.quantity,ri.unit,i.unit)*i.cost_per_unit),0)/r.yield_qty) else r.selling_price end as profit_per_yield
from recipes r left join recipe_ingredients ri on ri.recipe_id=r.id left join inventory_items i on i.id=ri.inventory_item_id
 group by r.id,r.name,r.yield_qty,r.yield_unit,r.selling_price,r.target_margin_pct;

create or replace function place_order(p_customer_name text,p_phone text,p_address text,p_placed_at timestamptz,p_dispatch_at timestamptz,p_total numeric,p_notes text,p_items jsonb,p_birthday date default null) returns uuid language plpgsql security definer as $$
declare oid uuid; item jsonb; ri record; needed numeric; available numeric; begin
 if p_total<0 then raise exception 'Order total cannot be negative'; end if;
 insert into customers(customer_name,phone,address,birthday,updated_at) values(p_customer_name,p_phone,p_address,p_birthday,now())
 on conflict(phone) do update set customer_name=excluded.customer_name,address=coalesce(nullif(excluded.address,''),customers.address),birthday=coalesce(excluded.birthday,customers.birthday),updated_at=now();
 insert into orders(customer_name,phone,address,placed_at,dispatch_at,total,notes) values(p_customer_name,p_phone,p_address,p_placed_at,p_dispatch_at,p_total,p_notes) returning id into oid;
 for item in select * from jsonb_array_elements(p_items) loop
   if (item->>'quantity')::numeric<=0 then raise exception 'Order quantity must be positive'; end if;
   insert into order_items(order_id,product_id,quantity) values(oid,(item->>'product_id')::uuid,(item->>'quantity')::numeric);
   for ri in select ri.*,r.yield_qty,i.name,i.unit as inventory_unit,i.quantity as available from recipe_ingredients ri join recipes r on r.id=ri.recipe_id join inventory_items i on i.id=ri.inventory_item_id where ri.recipe_id=(item->>'product_id')::uuid loop
     needed := normalize_qty(ri.quantity,ri.unit,ri.inventory_unit) / ri.yield_qty * (item->>'quantity')::numeric;
     if ri.available < needed then raise exception 'Not enough %: need %, have %',ri.name,round(needed,2),round(ri.available,2); end if;
     update inventory_items set quantity=quantity-needed,updated_at=now() where id=ri.inventory_item_id;
   end loop;
 end loop;
 if p_total >= 250 then
   insert into loyalty_cards(customer_name,phone,birthday,punches) values(p_customer_name,p_phone,p_birthday,1)
   on conflict(phone) do update set customer_name=excluded.customer_name,birthday=coalesce(excluded.birthday,loyalty_cards.birthday),punches=least(5,loyalty_cards.punches+case when loyalty_cards.punches<5 and not loyalty_cards.reward_redeemed then 1 else 0 end);
 end if;
 return oid;
end;$$;

-- SECURITY HARDENING: this app is private and requires Supabase Auth.
-- Remove the development-time public policies and allow authenticated users only.
do $$ declare t text; begin
  foreach t in array array['inventory_items','recipes','recipe_ingredients','orders','order_items','purchases','expenses','loyalty_cards','customers','menu_assets'] loop
    execute format('drop policy if exists "owner access %s" on public.%I', t, t);
  end loop;
end $$;

do $$ begin
 create policy "authenticated inventory access" on inventory_items for all to authenticated using (true) with check (true);
 create policy "authenticated recipes access" on recipes for all to authenticated using (true) with check (true);
 create policy "authenticated recipe ingredients access" on recipe_ingredients for all to authenticated using (true) with check (true);
 create policy "authenticated orders access" on orders for all to authenticated using (true) with check (true);
 create policy "authenticated order items access" on order_items for all to authenticated using (true) with check (true);
 create policy "authenticated purchases access" on purchases for all to authenticated using (true) with check (true);
 create policy "authenticated expenses access" on expenses for all to authenticated using (true) with check (true);
 create policy "authenticated loyalty access" on loyalty_cards for all to authenticated using (true) with check (true);
 create policy "authenticated customers access" on customers for all to authenticated using (true) with check (true);
 create policy "authenticated menu assets access" on menu_assets for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Storage: authenticated users can manage private app assets. Public read is retained so customer menu links can work.
do $$ begin
  drop policy if exists "upload SachaBakes assets" on storage.objects;
  drop policy if exists "update SachaBakes assets" on storage.objects;
  drop policy if exists "delete SachaBakes assets" on storage.objects;
  create policy "authenticated upload SachaBakes assets" on storage.objects for insert to authenticated with check (bucket_id='sachabakes-assets');
  create policy "authenticated update SachaBakes assets" on storage.objects for update to authenticated using (bucket_id='sachabakes-assets') with check (bucket_id='sachabakes-assets');
  create policy "authenticated delete SachaBakes assets" on storage.objects for delete to authenticated using (bucket_id='sachabakes-assets');
exception when duplicate_object then null; end $$;

revoke execute on function record_purchase(uuid,numeric,numeric,numeric,text,text) from anon;
revoke execute on function place_order(text,text,text,timestamptz,timestamptz,numeric,text,jsonb,date) from anon;
grant execute on function record_purchase(uuid,numeric,numeric,numeric,text,text) to authenticated;
grant execute on function place_order(text,text,text,timestamptz,timestamptz,numeric,text,jsonb,date) to authenticated;

-- Recommended hardening for SECURITY DEFINER functions.
alter function record_purchase(uuid,numeric,numeric,numeric,text,text) set search_path = public;
alter function place_order(text,text,text,timestamptz,timestamptz,numeric,text,jsonb,date) set search_path = public;
