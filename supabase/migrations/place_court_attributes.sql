-- Create place_attributes table
create table public.place_attributes (
  place_id  uuid not null references public.places(id) on delete cascade,
  key       text not null,
  value     text not null,
  primary key (place_id, key)
);

alter table public.place_attributes enable row level security;

create policy "Place attributes are viewable by everyone"
  on public.place_attributes for select
  using (true);

create policy "Authenticated users can insert place attributes"
  on public.place_attributes for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update place attributes"
  on public.place_attributes for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete place attributes"
  on public.place_attributes for delete
  using (auth.role() = 'authenticated');


-- Create court_attributes table
create table public.court_attributes (
  court_id  uuid not null references public.courts(id) on delete cascade,
  key       text not null,
  value     text not null,
  primary key (court_id, key)
);

alter table public.court_attributes enable row level security;

create policy "Court attributes are viewable by everyone"
  on public.court_attributes for select
  using (true);

create policy "Authenticated users can insert court attributes"
  on public.court_attributes for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update court attributes"
  on public.court_attributes for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete court attributes"
  on public.court_attributes for delete
  using (auth.role() = 'authenticated');
